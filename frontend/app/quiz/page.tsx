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
        <h1 className="mb-2 text-4xl font-bold text-gray-100">My Quizzes</h1>
        <p className="text-gray-400">
          Test your knowledge with automatically generated quizzes
        </p>
      </div>

      <div className="mb-6 flex justify-end">
        <Button>+ Create Quiz</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card hover className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg text-gray-100">
              Quiz — Introduction to React
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-400">
              10 questions on React fundamentals
            </p>
            <div className="mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Progress</span>
                <span className="font-medium text-gray-200">60%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-800">
                <div className="h-2 w-3/5 rounded-full bg-primary-600"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">6/10 completed</span>
              <Button size="sm">Continue</Button>
            </div>
          </CardContent>
        </Card>

        <Card hover className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg text-gray-100">Quiz — Algorithms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-400">
              15 questions on data structures
            </p>
            <div className="mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Score</span>
                <span className="font-medium text-gray-200">85%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-800">
                <div className="h-2 w-full rounded-full bg-green-600"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Completed</span>
              <Button size="sm" variant="outline">
                Review
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}