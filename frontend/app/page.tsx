import Link from 'next/link';
import { ArrowRight, Sparkles, BookOpen, Briefcase, MessageSquare, Shield, Zap } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-transparent to-blue-900/20" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-sm text-gray-300">AI-Powered Learning Platform</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
              Your Personal <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">AI Guide</span>
            </h1>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Moon Guide AI transforms your learning journey with personalized AI assistance, 
              intelligent career guidance, and a supportive educational community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-all"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/features"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/10 transition-all"
              >
                Explore Features
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-white/5">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: '10K+', label: 'Active Students' },
              { number: '500+', label: 'AI Tutors' },
              { number: '50K+', label: 'Questions Answered' },
              { number: '95%', label: 'Success Rate' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.number}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Preview Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Powerful AI-driven tools designed to accelerate your learning and career growth
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: MessageSquare,
                title: 'AI Tutor Chat',
                description: 'Get instant answers to your questions with our intelligent RAG-powered chat system.',
                color: 'from-violet-500/20 to-purple-500/20',
              },
              {
                icon: BookOpen,
                title: 'Smart Learning',
                description: 'Personalized study paths and resources tailored to your learning style and goals.',
                color: 'from-blue-500/20 to-cyan-500/20',
              },
              {
                icon: Briefcase,
                title: 'Career Guidance',
                description: 'AI-powered career recommendations and skill gap analysis for your dream job.',
                color: 'from-emerald-500/20 to-teal-500/20',
              },
              {
                icon: Zap,
                title: 'Quiz Generator',
                description: 'Auto-generated quizzes from your documents to test and reinforce your knowledge.',
                color: 'from-amber-500/20 to-orange-500/20',
              },
              {
                icon: Shield,
                title: 'Document Analysis',
                description: 'Upload and analyze documents with AI-powered insights and summaries.',
                color: 'from-rose-500/20 to-pink-500/20',
              },
              {
                icon: Sparkles,
                title: 'Community Classes',
                description: 'Join or create classes, share knowledge, and learn together with peers.',
                color: 'from-indigo-500/20 to-violet-500/20',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/features"
              className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 font-medium transition-colors"
            >
              View all features
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-white/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Start your journey in three simple steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Create Your Account',
                description: 'Sign up and complete your profile with your learning goals and interests.',
              },
              {
                step: '02',
                title: 'Choose Your Path',
                description: 'Select from personalized learning paths or get AI recommendations.',
              },
              {
                step: '03',
                title: 'Start Learning',
                description: 'Engage with AI tutors, join classes, and track your progress.',
              },
            ].map((item, i) => (
              <div key={i} className="relative text-center">
                <div className="text-6xl font-bold text-white/10 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-blue-600" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
            <div className="relative px-8 py-16 md:px-16 md:py-20 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Transform Your Learning?
              </h2>
              <p className="text-white/80 max-w-2xl mx-auto mb-8 text-lg">
                Join thousands of students already using Moon Guide AI to achieve their goals.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-violet-600 font-semibold rounded-lg hover:bg-gray-100 transition-all shadow-lg"
              >
                Get Started for Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}