import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from '@/components/ui';

export default function QuizPage() {
  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">Mes Quiz</h1>
        <p className="text-gray-600">
          Testez vos connaissances avec des quiz générés automatiquement
        </p>
      </div>

      <div className="mb-6 flex justify-end">
        <Button>+ Créer un quiz</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card hover>
          <CardHeader>
            <CardTitle className="text-lg">
              Quiz - Introduction à React
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600">
              10 questions sur les bases de React
            </p>
            <div className="mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Progression</span>
                <span className="font-medium">60%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div className="h-2 w-3/5 rounded-full bg-primary-600"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">6/10 complété</span>
              <Button size="sm">Continuer</Button>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardHeader>
            <CardTitle className="text-lg">Quiz - Algorithmes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600">
              15 questions sur les structures de données
            </p>
            <div className="mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Score</span>
                <span className="font-medium">85%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div className="h-2 w-full rounded-full bg-green-600"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Complété</span>
              <Button size="sm" variant="outline">
                Revoir
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
