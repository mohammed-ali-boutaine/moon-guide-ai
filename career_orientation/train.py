"""
Career Orientation — Model Training & Evaluation (v2)
======================================================
Trains a career classifier on generated profiles from data/raw_profiles.json.
Encoder: partially-unfrozen sentence-transformers/all-MiniLM-L6-v2 (384-dim)
Head: 384 → 256 (BN) → 128 (BN) → 6

Improvements over v1:
- Unfreeze last 2 transformer layers for domain adaptation
- Differential learning rates (encoder vs head)
- BatchNorm in classifier head
- Label smoothing (0.1)
- ReduceLROnPlateau scheduler
- 40 epochs with early stopping (patience=8)

Usage:
    python train.py
"""

import json
import random
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torch.optim.lr_scheduler import ReduceLROnPlateau

from sentence_transformers import SentenceTransformer
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR / "data"
MODELS_DIR = SCRIPT_DIR / "models"
MODELS_DIR.mkdir(exist_ok=True)

RAW_DATA_PATH = DATA_DIR / "raw_profiles.json"
LABEL_MAP_PATH = DATA_DIR / "label_map.json"
BEST_MODEL_PATH = MODELS_DIR / "best_model.pt"
FINAL_MODEL_PATH = MODELS_DIR / "career_model.pt"

# ── Hyperparameters ───────────────────────────────────────────────────────────
SEED = 42
EPOCHS = 40
BATCH_SIZE = 32
HEAD_LR = 2e-4
ENCODER_LR = 5e-6          # much lower LR for fine-tuned encoder layers
WEIGHT_DECAY = 1e-4
LABEL_SMOOTHING = 0.1
PATIENCE = 8                # early stopping patience
UNFREEZE_LAST_N = 2         # number of transformer layers to unfreeze

# ── Reproducibility ───────────────────────────────────────────────────────────
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

# ── Device ────────────────────────────────────────────────────────────────────
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")


# ── Preprocessing ─────────────────────────────────────────────────────────────
def profile_to_text(profile: dict) -> str:
    """Serialize a profile dict to a fixed-format text string."""
    skills = ", ".join(profile.get("skills", []))
    interests = ", ".join(profile.get("interests", []))
    projects = ". ".join(profile.get("projects", []))
    goals = profile.get("goals", {})
    acad = profile.get("academic_performance", {})

    return (
        f"Skills: {skills}. "
        f"Interests: {interests}. "
        f"Projects: {projects}. "
        f"Goals: target {goals.get('target_field', 'N/A')}, "
        f"salary {goals.get('salary_expectation', 'N/A')}, "
        f"remote {goals.get('remote_preference', 'N/A')}. "
        f"Academic: Math {acad.get('math', 0)}/20, "
        f"Sciences {acad.get('sciences', 0)}/20, "
        f"Languages {acad.get('languages', 0)}/20, "
        f"Arts {acad.get('arts', 0)}/20."
    )


# ── Dataset ───────────────────────────────────────────────────────────────────
class CareerDataset(Dataset):
    def __init__(self, texts: list[str], labels: list[int]):
        self.texts = texts
        self.labels = labels

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        return self.texts[idx], self.labels[idx]


# ── Model ─────────────────────────────────────────────────────────────────────
class CareerClassifier(nn.Module):
    def __init__(self, num_classes: int = 6):
        super().__init__()
        self.encoder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

        # Freeze everything first
        for param in self.encoder.parameters():
            param.requires_grad = False

        # Unfreeze last N transformer layers for domain adaptation
        transformer = self.encoder[0].auto_model  # the underlying BERT model
        total_layers = len(transformer.encoder.layer)
        for layer in transformer.encoder.layer[total_layers - UNFREEZE_LAST_N:]:
            for param in layer.parameters():
                param.requires_grad = True

        self.classifier = nn.Sequential(
            nn.Linear(384, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, num_classes),
        )

    def forward(self, texts: list[str]) -> torch.Tensor:
        embeddings = self.encoder.encode(
            texts, convert_to_tensor=True, device=device, show_progress_bar=False
        )
        embeddings = embeddings.clone()  # detach from encode graph for backward
        return self.classifier(embeddings)


def load_data():
    """Load raw profiles, encode labels, split into train/val/test."""
    if not RAW_DATA_PATH.exists():
        raise FileNotFoundError(
            f"Data not found at {RAW_DATA_PATH}.\n"
            "Run generate_data.py first to create the training data."
        )

    with open(RAW_DATA_PATH, "r", encoding="utf-8") as f:
        raw_profiles = json.load(f)

    print(f"Loaded {len(raw_profiles)} profiles from {RAW_DATA_PATH}")

    texts = [profile_to_text(p) for p in raw_profiles]
    labels = [p["label"] for p in raw_profiles]

    # Label encoding (alphabetical)
    sorted_classes = sorted(set(labels))
    label_to_id = {cls: idx for idx, cls in enumerate(sorted_classes)}
    id_to_label = {idx: cls for cls, idx in label_to_id.items()}
    label_ids = [label_to_id[l] for l in labels]

    print("Label mapping:")
    for cls, idx in label_to_id.items():
        print(f"  {idx}: {cls}")

    # Save label map
    with open(LABEL_MAP_PATH, "w", encoding="utf-8") as f:
        json.dump(label_to_id, f, indent=2)

    # Per-class distribution
    df = pd.DataFrame({"label": labels})
    print(f"\nPer-class distribution:\n{df['label'].value_counts().to_string()}\n")

    # Split 70/15/15 stratified
    X_train, X_temp, y_train, y_temp = train_test_split(
        texts, label_ids, test_size=0.30, stratify=label_ids, random_state=SEED
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, stratify=y_temp, random_state=SEED
    )
    print(f"Train: {len(X_train)}  |  Val: {len(X_val)}  |  Test: {len(X_test)}")

    return (X_train, y_train), (X_val, y_val), (X_test, y_test), label_to_id, id_to_label


def train_model(model, train_data, val_data, epochs=EPOCHS, batch_size=BATCH_SIZE):
    """Train with differential LR, label smoothing, scheduler, and early stopping."""
    X_train, y_train = train_data
    X_val, y_val = val_data

    train_loader = DataLoader(
        CareerDataset(X_train, y_train), batch_size=batch_size, shuffle=True
    )
    val_loader = DataLoader(
        CareerDataset(X_val, y_val), batch_size=batch_size, shuffle=False
    )

    criterion = nn.CrossEntropyLoss(label_smoothing=LABEL_SMOOTHING)

    # Differential learning rates: encoder layers get a much smaller LR
    encoder_params = [p for p in model.encoder.parameters() if p.requires_grad]
    head_params = list(model.classifier.parameters())
    optimizer = torch.optim.AdamW([
        {"params": encoder_params, "lr": ENCODER_LR},
        {"params": head_params, "lr": HEAD_LR},
    ], weight_decay=WEIGHT_DECAY)

    scheduler = ReduceLROnPlateau(
        optimizer, mode="max", factor=0.5, patience=3, verbose=True
    )

    history = {"train_loss": [], "val_loss": [], "val_acc": []}
    best_val_acc = 0.0
    epochs_no_improve = 0

    for epoch in range(1, epochs + 1):
        # Train
        model.train()
        running_loss = 0.0
        for texts_batch, labels_batch in train_loader:
            labels_batch = torch.tensor(labels_batch, dtype=torch.long).to(device)
            optimizer.zero_grad()
            logits = model(list(texts_batch))
            loss = criterion(logits, labels_batch)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            running_loss += loss.item() * len(texts_batch)
        train_loss = running_loss / len(X_train)

        # Validate
        model.eval()
        val_loss_sum = 0.0
        val_preds, val_true = [], []
        with torch.no_grad():
            for texts_batch, labels_batch in val_loader:
                labels_tensor = torch.tensor(labels_batch, dtype=torch.long).to(device)
                logits = model(list(texts_batch))
                val_loss_sum += criterion(logits, labels_tensor).item() * len(texts_batch)
                val_preds.extend(logits.argmax(dim=1).cpu().tolist())
                val_true.extend(list(labels_batch))
        val_loss = val_loss_sum / len(X_val)
        val_acc = accuracy_score(val_true, val_preds)

        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        history["val_acc"].append(val_acc)

        scheduler.step(val_acc)

        saved_marker = ""
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            epochs_no_improve = 0
            torch.save(model.state_dict(), BEST_MODEL_PATH)
            saved_marker = " *saved*"
        else:
            epochs_no_improve += 1

        print(
            f"Epoch {epoch:02d}/{epochs} | "
            f"Train Loss: {train_loss:.4f} | "
            f"Val Loss: {val_loss:.4f} | "
            f"Val Acc: {val_acc:.4f}{saved_marker}"
        )

        if epochs_no_improve >= PATIENCE:
            print(f"\nEarly stopping at epoch {epoch} (no improvement for {PATIENCE} epochs)")
            break

    print(f"\nBest validation accuracy: {best_val_acc:.4f}")
    return history, best_val_acc


def evaluate(model, test_data, id_to_label):
    """Evaluate on test set and print classification report."""
    X_test, y_test = test_data
    test_loader = DataLoader(
        CareerDataset(X_test, y_test), batch_size=32, shuffle=False
    )

    model.eval()
    all_preds, all_true = [], []
    with torch.no_grad():
        for texts_batch, labels_batch in test_loader:
            logits = model(list(texts_batch))
            all_preds.extend(logits.argmax(dim=1).cpu().tolist())
            all_true.extend(list(labels_batch))

    test_acc = accuracy_score(all_true, all_preds)
    print(f"\nTest Accuracy: {test_acc:.4f} ({test_acc * 100:.1f}%)")
    if test_acc >= 0.85:
        print("Target of 85% reached!")
    else:
        print("Below 85% target — consider more epochs or data augmentation.")

    target_names = [id_to_label[i] for i in range(len(id_to_label))]
    print("\nClassification Report:")
    print(classification_report(all_true, all_preds, target_names=target_names))

    # Confusion matrix
    cm = confusion_matrix(all_true, all_preds)
    plt.figure(figsize=(9, 7))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=target_names, yticklabels=target_names)
    plt.title("Confusion Matrix — Test Set", fontsize=13)
    plt.ylabel("True Label")
    plt.xlabel("Predicted Label")
    plt.xticks(rotation=30, ha="right")
    plt.tight_layout()
    cm_path = DATA_DIR / "confusion_matrix.png"
    plt.savefig(cm_path, dpi=150)
    print(f"Confusion matrix saved to {cm_path}")
    plt.close()

    return test_acc


def save_training_curves(history):
    """Save loss and accuracy plots."""
    epochs_x = list(range(1, len(history["train_loss"]) + 1))
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 4))

    ax1.plot(epochs_x, history["train_loss"], label="Train Loss", marker="o", markersize=3)
    ax1.plot(epochs_x, history["val_loss"], label="Val Loss", marker="o", markersize=3)
    ax1.set_title("Loss over Epochs")
    ax1.set_xlabel("Epoch")
    ax1.set_ylabel("Cross-Entropy Loss")
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    ax2.plot(epochs_x, history["val_acc"], label="Val Accuracy", color="green", marker="o", markersize=3)
    ax2.axhline(y=0.85, linestyle="--", color="red", alpha=0.5, label="Target (85%)")
    ax2.set_title("Validation Accuracy over Epochs")
    ax2.set_xlabel("Epoch")
    ax2.set_ylabel("Accuracy")
    ax2.set_ylim(0, 1)
    ax2.legend()
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    curves_path = DATA_DIR / "training_curves.png"
    plt.savefig(curves_path, dpi=150)
    print(f"Training curves saved to {curves_path}")
    plt.close()


def main():
    # Load & split data
    train_data, val_data, test_data, label_to_id, id_to_label = load_data()

    # Build model
    num_classes = len(label_to_id)
    model = CareerClassifier(num_classes=num_classes).to(device)
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    frozen = sum(p.numel() for p in model.parameters()) - trainable
    encoder_trainable = sum(p.numel() for p in model.encoder.parameters() if p.requires_grad)
    head_trainable = sum(p.numel() for p in model.classifier.parameters())
    print(f"\nTrainable: {trainable:,} (encoder: {encoder_trainable:,}, head: {head_trainable:,})")
    print(f"Frozen: {frozen:,}\n")

    # Train
    history, best_val_acc = train_model(model, train_data, val_data)
    save_training_curves(history)

    # Evaluate best checkpoint
    eval_model = CareerClassifier(num_classes=num_classes).to(device)
    eval_model.load_state_dict(torch.load(BEST_MODEL_PATH, map_location=device))
    test_acc = evaluate(eval_model, test_data, id_to_label)

    # Save final model
    torch.save(eval_model.state_dict(), FINAL_MODEL_PATH)
    model_size_mb = FINAL_MODEL_PATH.stat().st_size / (1024 ** 2)

    print()
    print("=" * 50)
    print("        MODEL SUMMARY")
    print("=" * 50)
    print(f"  Encoder        : all-MiniLM-L6-v2 (frozen)")
    print(f"  Classes        : {num_classes}")
    print(f"  Best Val Acc   : {best_val_acc:.4f}")
    print(f"  Test Accuracy  : {test_acc:.4f}")
    print(f"  Model Size     : {model_size_mb:.2f} MB")
    print(f"  Saved to       : {FINAL_MODEL_PATH}")
    print("=" * 50)


if __name__ == "__main__":
    main()
