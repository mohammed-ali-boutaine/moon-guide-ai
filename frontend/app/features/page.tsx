import { 
  MessageSquare, BookOpen, Briefcase, Zap, Shield, 
  Sparkles, Target, Users, FileText, Brain, BarChart3, Clock
} from 'lucide-react';

export const metadata = {
  title: 'Features | Moon Guide AI',
  description: 'Discover the powerful AI-driven features of Moon Guide AI - your personal learning assistant.',
};

export default function FeaturesPage() {
  const features = [
    {
      icon: MessageSquare,
      title: 'AI Tutor Chat',
      description: 'Engage in natural conversations with our AI tutor powered by advanced RAG (Retrieval-Augmented Generation). Get accurate, context-aware answers to your questions instantly.',
      highlights: ['24/7 Availability', 'Context-aware responses', 'Multi-language support'],
    },
    {
      icon: BookOpen,
      title: 'Smart Learning Paths',
      description: 'AI-curated learning paths tailored to your goals, skill level, and learning style. Progress through structured content designed specifically for you.',
      highlights: ['Personalized curriculum', 'Adaptive difficulty', 'Progress tracking'],
    },
    {
      icon: Briefcase,
      title: 'Career Guidance',
      description: 'Get AI-powered career recommendations based on your skills, interests, and market trends. Identify skill gaps and receive guidance on how to bridge them.',
      highlights: ['Skill gap analysis', 'Market insights', 'Career roadmap'],
    },
    {
      icon: Zap,
      title: 'AI Quiz Generator',
      description: 'Automatically generate quizzes from your uploaded documents or study materials. Test your knowledge with AI-created questions that adapt to your level.',
      highlights: ['Document-based quizzes', 'Adaptive questions', 'Instant feedback'],
    },
    {
      icon: Shield,
      title: 'Document Analysis',
      description: 'Upload PDFs, documents, and study materials for AI-powered analysis. Get summaries, key insights, and answers to questions about your documents.',
      highlights: ['PDF processing', 'Smart summaries', 'Question extraction'],
    },
    {
      icon: Sparkles,
      title: 'Community Classes',
      description: 'Join or create virtual classrooms to learn together with peers. Share resources, discuss topics, and collaborate on projects in a supportive environment.',
      highlights: ['Virtual classrooms', 'Resource sharing', 'Collaborative learning'],
    },
  ];

  const additionalFeatures = [
    { icon: Target, title: 'Goal Setting', description: 'Set and track learning goals with AI-powered milestones and reminders.' },
    { icon: Users, title: 'Peer Matching', description: 'Connect with learners who have similar goals and complementary skills.' },
    { icon: FileText, title: 'Note Taking', description: 'AI-enhanced note taking with auto-organization and smart search.' },
    { icon: Brain, title: 'Knowledge Retention', description: 'Spaced repetition and review schedules optimized by AI for maximum retention.' },
    { icon: BarChart3, title: 'Analytics Dashboard', description: 'Detailed insights into your learning patterns, progress, and achievements.' },
    { icon: Clock, title: 'Study Scheduler', description: 'AI-optimized study schedules that adapt to your availability and peak focus times.' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-24 pb-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Powerful Features for <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">Modern Learners</span>
          </h1>
          <p className="text-xl text-gray-400">
            Everything you need to accelerate your learning journey, powered by cutting-edge AI technology.
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-20">
          {features.map((feature, i) => (
            <div
              key={i}
              className="group p-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <feature.icon className="w-7 h-7 text-violet-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">{feature.title}</h2>
              <p className="text-gray-400 mb-6 leading-relaxed">{feature.description}</p>
              <ul className="space-y-2">
                {feature.highlights.map((highlight, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Additional Features */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-white text-center mb-12">More Great Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {additionalFeatures.map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack Section */}
        <div className="rounded-2xl bg-gradient-to-br from-violet-900/20 to-blue-900/20 border border-white/10 p-8 md:p-12">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">Powered by Advanced Technology</h2>
            <p className="text-gray-400 mb-8">
              Moon Guide AI leverages state-of-the-art technologies including RAG (Retrieval-Augmented Generation), 
              Natural Language Processing, and Machine Learning to deliver an unparalleled learning experience.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {['RAG Architecture', 'NLP Processing', 'Machine Learning', 'Cloud Infrastructure', 'Real-time Sync'].map((tech, i) => (
                <span
                  key={i}
                  className="px-4 py-2 rounded-full bg-white/10 text-sm text-gray-300 border border-white/10"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
