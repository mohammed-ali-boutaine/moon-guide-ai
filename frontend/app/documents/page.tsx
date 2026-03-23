import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from '@/components/ui';

export default function DocumentsPage() {
  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold text-gray-100">My Documents</h1>
        <p className="text-gray-400">
          Manage your learning materials and access your courses
        </p>
      </div>

      <div className="mb-6 flex justify-end">
        <Button>+ Add Document</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card hover className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg text-gray-100">Introduction to React</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-400">
              Complete course on React fundamentals and components
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">2 days ago</span>
              <Button size="sm" variant="ghost">
                Open
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card hover className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg text-gray-100">Advanced Algorithms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-400">
              Data structures and sorting algorithms
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">1 week ago</span>
              <Button size="sm" variant="ghost">
                Open
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed border-gray-700 bg-gray-900" hover>
          <CardContent className="flex h-full min-h-[200px] items-center justify-center">
            <div className="text-center">
              <p className="mb-2 text-gray-500">No other documents</p>
              <Button variant="outline" size="sm">
                Add Document
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}