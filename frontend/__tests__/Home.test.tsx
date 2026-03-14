import { render, screen } from '@testing-library/react';
import Home from '../app/page';

describe('Home Page', () => {
  it('renders the hero heading', () => {
    render(<Home />);
    expect(screen.getByText(/AI Guide/i)).toBeInTheDocument();
  });

  it('renders the platform tagline', () => {
    render(<Home />);
    expect(screen.getByText(/AI-Powered Learning Platform/i)).toBeInTheDocument();
  });

  it('renders Get Started link', () => {
    render(<Home />);
    const links = screen.getAllByRole('link', { name: /get started/i });
    expect(links.length).toBeGreaterThan(0);
  });

  it('renders all six feature cards', () => {
    render(<Home />);
    expect(screen.getByText('AI Tutor Chat')).toBeInTheDocument();
    expect(screen.getByText('Smart Learning')).toBeInTheDocument();
    expect(screen.getByText('Career Guidance')).toBeInTheDocument();
    expect(screen.getByText('Quiz Generator')).toBeInTheDocument();
    expect(screen.getByText('Document Analysis')).toBeInTheDocument();
    expect(screen.getByText('Community Classes')).toBeInTheDocument();
  });

  it('renders the three how-it-works steps', () => {
    render(<Home />);
    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
    expect(screen.getByText('Choose Your Path')).toBeInTheDocument();
    expect(screen.getByText('Start Learning')).toBeInTheDocument();
  });

  it('renders stats section', () => {
    render(<Home />);
    expect(screen.getByText('Active Students')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
  });
});
