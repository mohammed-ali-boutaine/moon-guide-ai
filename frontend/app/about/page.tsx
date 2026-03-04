import { Target, Users, Lightbulb, Heart, Rocket, Globe, Award, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'About Us | Moon Guide AI',
  description: 'Learn about Moon Guide AI - our mission, vision, and the team behind the AI-powered learning platform.',
};

export default function AboutPage() {
  const values = [
    {
      icon: Lightbulb,
      title: 'Innovation',
      description: 'We constantly push the boundaries of AI to create cutting-edge learning experiences.',
    },
    {
      icon: Users,
      title: 'Accessibility',
      description: 'Quality education should be available to everyone, regardless of location or background.',
    },
    {
      icon: Heart,
      title: 'Student-First',
      description: 'Every feature we build is designed with students needs and success in mind.',
    },
    {
      icon: Target,
      title: 'Excellence',
      description: 'We are committed to delivering the highest quality learning tools and experiences.',
    },
  ];

  const milestones = [
    { year: '2023', title: 'Founded', description: 'Moon Guide AI was founded with a vision to democratize education.' },
    { year: '2023', title: 'Beta Launch', description: 'First version released to 1,000 beta testers.' },
    { year: '2024', title: 'RAG Integration', description: 'Implemented advanced RAG technology for accurate AI responses.' },
    { year: '2024', title: 'Global Reach', description: 'Expanded to support 10+ languages and 50+ countries.' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-24 pb-16">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-gray-300">Our Story</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Empowering Learners <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">Worldwide</span>
          </h1>
          <p className="text-xl text-gray-400 leading-relaxed">
            Moon Guide AI was born from a simple belief: everyone deserves access to personalized, 
            high-quality education. We are building the future of learning, one AI conversation at a time.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-8 mb-24">
          <div className="p-8 rounded-2xl border border-white/10 bg-gradient-to-br from-violet-900/20 to-transparent">
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center mb-6">
              <Rocket className="w-6 h-6 text-violet-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
            <p className="text-gray-400 leading-relaxed">
              To democratize education by making AI-powered personalized learning accessible to every 
              student, everywhere. We believe technology should adapt to learners, not the other way around.
            </p>
          </div>
          <div className="p-8 rounded-2xl border border-white/10 bg-gradient-to-br from-blue-900/20 to-transparent">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-6">
              <Globe className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Our Vision</h2>
            <p className="text-gray-400 leading-relaxed">
              A world where every learner has a personal AI tutor that understands their unique needs, 
              adapts to their learning style, and helps them achieve their full potential.
            </p>
          </div>
        </div>

        {/* Core Values */}
        <div className="mb-24">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Our Core Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-center"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-7 h-7 text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{value.title}</h3>
                <p className="text-gray-400 text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-24">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Our Journey</h2>
          <div className="max-w-3xl mx-auto">
            {milestones.map((milestone, i) => (
              <div key={i} className="relative flex gap-8 pb-12 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                    {milestone.year.slice(-2)}
                  </div>
                  {i !== milestones.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gradient-to-b from-violet-500/50 to-transparent mt-4" />
                  )}
                </div>
                <div className="flex-1 pt-2">
                  <span className="text-sm text-violet-400 font-medium">{milestone.year}</span>
                  <h3 className="text-xl font-semibold text-white mt-1 mb-2">{milestone.title}</h3>
                  <p className="text-gray-400">{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="rounded-2xl bg-gradient-to-br from-violet-900/20 to-blue-900/20 border border-white/10 p-8 md:p-12 mb-24">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: '50K+', label: 'Students Helped' },
              { number: '100+', label: 'Team Members' },
              { number: '10+', label: 'Countries' },
              { number: '24/7', label: 'AI Support' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stat.number}</div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-6">
            <Award className="w-8 h-8 text-violet-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Why Moon Guide AI?</h2>
          <p className="text-gray-400 text-lg leading-relaxed mb-8">
            Unlike traditional learning platforms, Moon Guide AI adapts to you. Our RAG-powered 
            system provides accurate, context-aware assistance that evolves with your learning journey. 
            We are not just another ed-tech company – we are your partner in lifelong learning.
          </p>
        </div>
      </div>
    </div>
  );
}
