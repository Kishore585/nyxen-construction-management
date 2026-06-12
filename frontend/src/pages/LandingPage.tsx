import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Camera, MapPin, FileSearch, BookOpen, Shield, Zap, ArrowRight } from 'lucide-react';
import { useApp } from '../store/appStore';

const features = [
  {
    icon: Camera,
    title: 'AI Image Analysis',
    desc: 'Upload site photos and let AI detect construction elements, extract dimensions, and validate structural components automatically.',
    color: 'var(--color-accent-blue)',
    bg: 'var(--color-accent-blue-dim)',
  },
  {
    icon: MapPin,
    title: 'GPS Verification',
    desc: 'Validate GPS coordinates from image EXIF metadata against authorized land parcels with spoofing detection.',
    color: 'var(--color-accent-emerald)',
    bg: 'var(--color-accent-emerald-dim)',
  },
  {
    icon: FileSearch,
    title: 'Land Registry',
    desc: 'Cross-reference survey numbers with official land records across Maharashtra, Karnataka, and Uttar Pradesh.',
    color: 'var(--color-accent-purple)',
    bg: 'var(--color-accent-purple-dim)',
  },
  {
    icon: BookOpen,
    title: 'Nyxen Generator',
    desc: 'Generate CPWD/PWD-compliant measurement book entries with automatic quantity calculations and DSR item mapping.',
    color: 'var(--color-accent-amber)',
    bg: 'var(--color-accent-amber-dim)',
  },
  {
    icon: Shield,
    title: 'Audit Reports',
    desc: 'Comprehensive compliance scoring with GPS validation, registry checks, measurement accuracy, and fraud detection.',
    color: 'var(--color-accent-red)',
    bg: 'var(--color-accent-red-dim)',
  },
  {
    icon: Zap,
    title: 'Real-time Processing',
    desc: 'Process site photographs in seconds with instant dimension estimation, element detection, and measurement generation.',
    color: 'var(--color-accent-blue)',
    bg: 'var(--color-accent-blue-dim)',
  },
];

const steps = [
  { num: 1, title: 'Upload Photos', desc: 'Capture site photos with GPS-enabled cameras and upload them to the platform.' },
  { num: 2, title: 'AI Analysis', desc: 'AI processes images to detect elements, extract GPS data, and estimate dimensions.' },
  { num: 3, title: 'Cross-Reference', desc: 'GPS and survey data are validated against land registry records automatically.' },
  { num: 4, title: 'Generate Report', desc: 'Get CPWD-compliant Nyxen entries and comprehensive audit reports instantly.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { state } = useApp();
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);

  const handleGetStarted = () => {
    if (state.isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="landing">
      {/* Navigation */}
      <nav className="landing__nav">
        <div className="landing__nav-brand">
          <Building2 size={24} />
          Nyxen AI
        </div>
        <div className="landing__nav-links">
          <a href="#features" className="landing__nav-link">Features</a>
          <a href="#how-it-works" className="landing__nav-link">How it Works</a>
          <button className="btn btn-primary btn-sm" onClick={handleGetStarted}>
            {state.isAuthenticated ? 'Dashboard' : 'Get Started'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing__hero">
        <div className="landing__hero-bg">
          <div className="landing__grid" />
          <div className="landing__orb landing__orb--1" />
          <div className="landing__orb landing__orb--2" />
          <div className="landing__orb landing__orb--3" />
        </div>

        <div className="landing__hero-content">
          <div className="landing__badge">
            <Zap size={14} />
            AI-Powered Construction Verification
          </div>

          <h1 className="landing__title">
            Intelligent <span className="landing__title-accent">Nyxen Verification</span> & Auditing
          </h1>

          <p className="landing__subtitle">
            Automate construction measurement verification with AI image analysis,
            GPS validation, and land registry cross-referencing. Eliminate fraud,
            reduce delays, and ensure compliance — all in real time.
          </p>

          <div className="landing__cta-group">
            <button className="btn btn-primary btn-lg" onClick={handleGetStarted}>
              Get Started <ArrowRight size={18} />
            </button>
            <a href="#features" className="btn btn-secondary btn-lg">
              Explore Features
            </a>
          </div>

          <div className="landing__hero-stats">
            <div className="landing__hero-stat">
              <div className="landing__hero-stat-value">5</div>
              <div className="landing__hero-stat-label">Active Projects</div>
            </div>
            <div className="landing__hero-stat">
              <div className="landing__hero-stat-value">20+</div>
              <div className="landing__hero-stat-label">Measurements</div>
            </div>
            <div className="landing__hero-stat">
              <div className="landing__hero-stat-value">55</div>
              <div className="landing__hero-stat-label">Registry Records</div>
            </div>
            <div className="landing__hero-stat">
              <div className="landing__hero-stat-value">87%</div>
              <div className="landing__hero-stat-label">Avg Confidence</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="landing__section">
        <div className="landing__section-header">
          <h2 className="landing__section-title">Powerful Features</h2>
          <p className="landing__section-desc">
            Everything you need to verify construction measurements, validate locations,
            and generate audit-ready reports.
          </p>
        </div>
        <div className="landing__features">
          {features.map((f, i) => {
            const Icon = f.icon;
            const isExpanded = expandedFeature === i;
            return (
              <div
                key={i}
                className={`glass-card landing__feature-card ${isExpanded ? 'landing__feature-card--expanded' : ''}`}
                onClick={() => setExpandedFeature(isExpanded ? null : i)}
              >
                <div
                  className="landing__feature-icon"
                  style={{ background: f.bg, color: f.color }}
                >
                  <Icon size={28} />
                </div>
                <h3 className="landing__feature-title">{f.title}</h3>
                <div className={`landing__feature-desc-wrapper ${isExpanded ? 'landing__feature-desc-wrapper--open' : ''}`}>
                  <p className="landing__feature-desc">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="landing__section">
        <div className="landing__section-header">
          <h2 className="landing__section-title">How It Works</h2>
          <p className="landing__section-desc">
            From site photo to audit report in four simple steps.
          </p>
        </div>
        <div className="landing__steps">
          {steps.map((step, i) => (
            <div key={i} className="landing__step">
              <div className="landing__step-number">{step.num}</div>
              <h4 className="landing__step-title">{step.title}</h4>
              <p className="landing__step-desc">{step.desc}</p>
              {i < steps.length - 1 && <div className="landing__step-connector" />}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing__cta-section">
        <div className="landing__cta-bg" />
        <div className="landing__cta-content">
          <h2 className="landing__cta-title">Ready to Get Started?</h2>
          <p className="landing__cta-desc">
            Join the future of construction verification. Upload your first site photo
            and see AI-powered analysis in action.
          </p>
          <button className="btn btn-primary btn-lg" onClick={handleGetStarted}>
            Launch Dashboard <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: 'var(--space-2xl) var(--space-3xl)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 'var(--space-lg)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
              <Building2 size={18} style={{ color: 'var(--color-accent-blue)' }} />
              <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>Nyxen AI</span>
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
              © 2026 NYXen Team. AI-Powered Construction Verification.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            {['React', 'TypeScript', 'Express', 'MongoDB', 'Gemini AI'].map(tech => (
              <span key={tech} style={{
                padding: '4px 10px', borderRadius: 'var(--radius-full)',
                fontSize: 'var(--font-size-xs)', fontWeight: 500,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--color-text-tertiary)',
              }}>
                {tech}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
