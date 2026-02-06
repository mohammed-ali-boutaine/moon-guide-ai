import Link from 'next/link';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui';
// Cannot find namespace 'JSX'.ts(2503)
import { JSX } from 'react';

// JSX element implicitly has type 'any' because no interface 'JSX.IntrinsicElements' exists.ts(7026)
export default function Home() : JSX.Element {
  return (
    <div className="container py-12">
      {/* Hero Section */}
      <section className="mb-16 text-center">
        <h1 className="mb-4 text-5xl font-bold text-gray-900 animate-fade-in">
          Bienvenue sur{' '}
          <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            Moon Guide AI
          </span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600 animate-slide-up">
          Votre assistant personnel IA pour l&apos;apprentissage et la carrière, 
          propulsé par RAG, NLP et personnalisation.
        </p>
        <div className="flex justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/documents">Commencer</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#features">En savoir plus</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card hover>
          <CardHeader>
            <div className="mb-2 h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">📚</span>
            </div>
            <CardTitle className="text-xl">Assistant d&apos;apprentissage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Compréhension de documents, résumés automatiques, et extraction de points clés
              pour faciliter votre apprentissage.
            </p>
          </CardContent>
        </Card>

        <Card hover>
          <CardHeader>
            <div className="mb-2 h-12 w-12 rounded-lg bg-secondary-100 flex items-center justify-center">
              <span className="text-2xl">💬</span>
            </div>
            <CardTitle className="text-xl">Chatbot personnalisé</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Un chatbot entraîné sur vos documents pour répondre à toutes vos questions
              et vous aider à réviser.
            </p>
          </CardContent>
        </Card>

        <Card hover>
          <CardHeader>
            <div className="mb-2 h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
            <CardTitle className="text-xl">Quiz et tests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Génération automatique de quiz, QCM, et flashcards pour tester vos
              connaissances.
            </p>
          </CardContent>
        </Card>

        <Card hover>
          <CardHeader>
            <div className="mb-2 h-12 w-12 rounded-lg bg-secondary-100 flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
            <CardTitle className="text-xl">Suivi personnalisé</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              L&apos;IA suit vos faiblesses et recommande des révisions ciblées pour
              maximiser votre progression.
            </p>
          </CardContent>
        </Card>

        <Card hover>
          <CardHeader>
            <div className="mb-2 h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">💼</span>
            </div>
            <CardTitle className="text-xl">Assistant carrière</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Analyse de CV, suggestions d&apos;amélioration, et recommandations
              personnalisées pour votre carrière.
            </p>
          </CardContent>
        </Card>

        <Card hover>
          <CardHeader>
            <div className="mb-2 h-12 w-12 rounded-lg bg-secondary-100 flex items-center justify-center">
              <span className="text-2xl">🔄</span>
            </div>
            <CardTitle className="text-xl">Révision intelligente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Système de révision espacée pour une mémorisation optimale et durable de
              vos connaissances.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
