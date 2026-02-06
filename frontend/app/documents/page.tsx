import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';

export default function DocumentsPage() {
  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">Mes Documents</h1>
        <p className="text-gray-600">
          Gérez vos documents d&apos;apprentissage et accédez à vos cours
        </p>
      </div>

      <div className="mb-6 flex justify-end">
        <Button>+ Ajouter un document</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card hover>
          <CardHeader>
            <CardTitle className="text-lg">Introduction à React</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600">
              Cours complet sur les bases de React et les composants
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Il y a 2 jours</span>
              <Button size="sm" variant="ghost">
                Ouvrir
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardHeader>
            <CardTitle className="text-lg">Algorithmes avancés</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600">
              Structures de données et algorithmes de tri
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Il y a 1 semaine</span>
              <Button size="sm" variant="ghost">
                Ouvrir
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed" hover>
          <CardContent className="flex h-full min-h-[200px] items-center justify-center">
            <div className="text-center">
              <p className="mb-2 text-gray-500">Aucun autre document</p>
              <Button variant="outline" size="sm">
                Ajouter un document
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
