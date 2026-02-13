import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from '@/components/ui';

export default function CareerPage() {
  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">Assistant Carrière</h1>
        <p className="text-gray-600">
          Optimisez votre CV et recevez des recommandations personnalisées
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Mon CV</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 rounded-lg border-2 border-dashed p-8 text-center">
                <p className="mb-4 text-gray-600">Aucun CV téléchargé</p>
                <Button>Télécharger mon CV</Button>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Fonctionnalités</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    Analyse automatique de votre CV
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    Suggestions d&apos;amélioration
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    Recommandations de compétences
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    Identification des points forts
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progression</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Compétences techniques</span>
                    <span className="font-medium">75%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div className="h-2 w-3/4 rounded-full bg-primary-600"></div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Soft skills</span>
                    <span className="font-medium">60%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div className="h-2 w-3/5 rounded-full bg-secondary-600"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recommandations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="text-gray-600">
                  • Ajouter plus de projets pratiques
                </li>
                <li className="text-gray-600">
                  • Développer vos compétences en TypeScript
                </li>
                <li className="text-gray-600">
                  • Mettre en avant vos réalisations
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
