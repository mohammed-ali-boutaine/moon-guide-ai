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
        <h1 className="mb-2 text-4xl font-bold text-gray-100">Career Assistant</h1>
        <p className="text-gray-400">
          Optimize your resume and receive personalized recommendations
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-100">My Resume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 rounded-lg border-2 border-dashed border-gray-700 p-8 text-center">
                <p className="mb-4 text-gray-400">No resume uploaded</p>
                <Button>Upload Resume</Button>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-100">Features</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Automatic resume analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Improvement suggestions
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Skills recommendations
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Strengths identification
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg text-gray-100">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-gray-400">Technical skills</span>
                    <span className="font-medium text-gray-200">75%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-800">
                    <div className="h-2 w-3/4 rounded-full bg-primary-600"></div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-gray-400">Soft skills</span>
                    <span className="font-medium text-gray-200">60%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-800">
                    <div className="h-2 w-3/5 rounded-full bg-secondary-600"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg text-gray-100">Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Add more hands-on projects</li>
                <li>• Develop your TypeScript skills</li>
                <li>• Highlight your achievements</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}