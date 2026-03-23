'use client';

import { useState } from 'react';
import { 
  Mail, Phone, MapPin, Clock, Send, MessageCircle, 
  HelpCircle, Sparkles, ArrowRight, CheckCircle 
} from 'lucide-react';
import Link from 'next/link';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 3000);
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  const contactMethods = [
    {
      icon: Mail,
      title: 'Email Us',
      description: 'Our team typically responds within 24 hours.',
      value: 'support@moonguide.ai',
      href: 'mailto:support@moonguide.ai',
    },
    {
      icon: MessageCircle,
      title: 'Live Chat',
      description: 'Available for premium members.',
      value: 'Start a conversation',
      href: '#',
    },
    {
      icon: HelpCircle,
      title: 'Help Center',
      description: 'Browse our comprehensive documentation.',
      value: 'Visit Help Center',
      href: '#',
    },
  ];

  const faqs = [
    {
      question: 'How do I get started with Moon Guide AI?',
      answer: 'Simply create an account, complete your profile, and start exploring our AI tutor or join a class. It takes less than 5 minutes!',
    },
    {
      question: 'Is Moon Guide AI free to use?',
      answer: 'Yes! We offer a generous free tier with access to core features. Premium plans unlock advanced capabilities like unlimited document uploads and priority AI responses.',
    },
    {
      question: 'What types of documents can I upload?',
      answer: 'We support PDFs, Word documents, and text files. Our AI can analyze content, generate summaries, and create quizzes from your materials.',
    },
    {
      question: 'How accurate are the AI responses?',
      answer: 'Our RAG-powered system provides highly accurate, context-aware responses by combining AI with your specific documents and learning materials.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-24 pb-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-gray-300">Get in Touch</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            We would love to hear from <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">you</span>
          </h1>
          <p className="text-xl text-gray-400">
            Have questions or feedback? Our team is here to help you on your learning journey.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {contactMethods.map((method, i) => (
            <Link
              key={i}
              href={method.href}
              className="group p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <method.icon className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{method.title}</h3>
              <p className="text-gray-400 text-sm mb-3">{method.description}</p>
              <span className="text-violet-400 font-medium inline-flex items-center gap-1">
                {method.value}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Form */}
          <div className="p-8 rounded-2xl border border-white/10 bg-white/5">
            <h2 className="text-2xl font-bold text-white mb-6">Send us a message</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors"
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors"
                  placeholder="How can we help?"
                  required
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                  placeholder="Tell us more about your question or feedback..."
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-all"
              >
                {isSubmitted ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Message Sent!
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>

          {/* FAQ Section */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
                >
                  <h3 className="text-white font-medium mb-2 flex items-start gap-2">
                    <HelpCircle className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                    {faq.question}
                  </h3>
                  <p className="text-gray-400 text-sm pl-7">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Office Info */}
        <div className="mt-20 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Location</p>
              <p className="text-white">San Francisco, CA</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Support Hours</p>
              <p className="text-white">24/7 AI Support</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
              <Phone className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Enterprise</p>
              <p className="text-white">+1 (555) 123-4567</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
