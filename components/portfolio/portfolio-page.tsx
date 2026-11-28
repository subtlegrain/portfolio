import type { CSSProperties } from 'react'
import { NeuralHero } from './neural-hero'
import { ScrollReveal } from './scroll-reveal'
import { SiteHeader } from './site-header'

type SectionProps = {
  id: string
  number: string
  label: string
  title: string
  intro?: string
  children: React.ReactNode
  className?: string
}

function Section({ id, number, label, title, intro, children, className = '' }: SectionProps) {
  return (
    <section className={`section ${className}`} id={id} aria-labelledby={`${id}-title`}>
      <div className="section-inner">
        <header className="section-head">
          <p className="section-meta">
            <span className="section-number">{number}</span>
            <span>{label}</span>
          </p>
          <div className="section-heading">
            <h2 id={`${id}-title`}>{title}</h2>
            {intro ? <p className="section-intro">{intro}</p> : null}
          </div>
        </header>
        <div className="section-body">{children}</div>
      </div>
    </section>
  )
}

const interests = [
  'LLM applications and AI agents',
  'Retrieval-augmented generation',
  'Document intelligence and information retrieval',
  'Backend engineering and API development',
  'AI-powered workflow automation',
]

const capabilities = [
  {
    title: 'LLM applications & agentic systems',
    items: ['Multi-step AI workflows', 'Graph-based orchestration', 'LLM API integrations', 'Structured generation and validation', 'Workflow state and execution'],
    note: 'Hands-on project experience, with a focus on learning sound patterns for reliable AI applications.',
  },
  {
    title: 'RAG & information retrieval',
    items: ['Document ingestion and extraction', 'Chunking strategies', 'Embeddings and semantic similarity', 'Vector databases', 'Dense and sparse retrieval', 'Hybrid search, RRF, and reranking', 'Grounded generation'],
    note: 'Experience with CGS retrieval-related components, including implemented document ingestion and hybrid-retrieval modules that are not yet wired into active LMS authoring.',
  },
  {
    title: 'Backend engineering',
    items: ['Python', 'FastAPI and REST APIs', 'PostgreSQL', 'SQLAlchemy', 'Pydantic'],
    note: 'Backend technologies used or explored through project work; depth varies by tool and task.',
  },
]

const opportunities = [
  'AI & Automation Engineering',
  'Python Backend Development',
  'LLM Application Development',
  'AI Agents and RAG Systems',
  'Workflow Automation and API Integrations',
]

const architecture = ['Instructor brief', 'LMS frontend', 'LMS backend', 'CGS /author', 'Async task', 'pypdfium2 → LLM → TipTap', 'Client polling']

export function PortfolioPage() {
  return (
    <div className="portfolio-site">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <NeuralHero />

        <Section
          id="about"
          number="01"
          label="About"
          title="A little about me"
          intro="Early-career engineer building a foundation across backend systems and applied AI."
        >
          <div className="about-grid" data-reveal>
            <p className="statement">
              I&apos;m an early-career AI Engineer and Python Backend Developer. I enjoy turning complex backend and AI
              workflows into useful, understandable software.
            </p>
            <div className="prose">
              <p>
                My recent internship work introduced me to the engineering behind content generation systems: API design,
                graph-orchestrated workflows, structured output, and document retrieval. I&apos;m especially interested in how
                these parts come together to make AI applications more useful and dependable.
              </p>
              <p>
                Outside a specific project, I&apos;m continuing to deepen my skills in LLM applications, information retrieval,
                and backend development.
              </p>
            </div>
          </div>

          <div className="interest-band" data-reveal>
            <span className="meta-label">Areas of interest</span>
            <ul className="interest-list">
              {interests.map((interest) => (
                <li key={interest}>{interest}</li>
              ))}
            </ul>
          </div>
        </Section>

        <Section
          id="experience"
          number="02"
          label="Experience"
          title="Where I've worked"
          intro="Internship experience across applied AI engineering and enterprise IT."
        >
          <ol className="timeline">
            <li className="timeline-row" data-reveal>
              <div className="timeline-aside">
                <span className="meta-label">Aug 2026 — Nov 2026</span>
                <span className="timeline-count">01</span>
              </div>
              <div className="timeline-body">
                <h3>AI Engineering Intern</h3>
                <p className="timeline-org">Fusemachines Nepal</p>
                <p className="timeline-copy">
                  Contributed to backend engineering for the Content Generation System (CGS), including Python and FastAPI
                  services, LangGraph workflows, LLM integration, structured generation and validation, document ingestion
                  and retrieval components, and integration with the LMS authoring flow.
                </p>
                <a className="link-arrow" href="/about">
                  Explore the CGS case study <span aria-hidden="true">↗</span>
                </a>
              </div>
            </li>
            <li className="timeline-row" data-reveal>
              <div className="timeline-aside">
                <span className="meta-label">Jun 2026 — Aug 2026</span>
                <span className="timeline-count">02</span>
              </div>
              <div className="timeline-body">
                <h3>Core IT Intern</h3>
                <p className="timeline-org">Sanima Bank</p>
                <p className="timeline-copy">
                  Built a cover-letter generation tool using the Gemini API. It accepts an uploaded CV (PDF) and a pasted
                  job description, then generates a tailored cover-letter draft. Also gained hands-on exposure to core IT
                  operations and networking fundamentals.
                </p>
              </div>
            </li>
          </ol>
        </Section>

        <Section id="education" number="03" label="Education" title="Education">
          <ol className="timeline education-timeline">
            <li className="timeline-row" data-reveal>
              <div className="timeline-aside">
                <span className="meta-label">Graduated 2026</span>
                <span className="timeline-count">01</span>
              </div>
              <div className="timeline-body">
                <h3>BSc CSIT</h3>
                <p className="timeline-org">Trinity International College · Tribhuvan University</p>
                <p className="timeline-copy">Transcript percentage: 74.5%</p>
              </div>
            </li>
            <li className="timeline-row" data-reveal>
              <div className="timeline-aside">
                <span className="meta-label">Graduated 2021</span>
                <span className="timeline-count">02</span>
              </div>
              <div className="timeline-body">
                <h3>+2 Science</h3>
                <p className="timeline-org">Khwopa Higher Secondary School</p>
              </div>
            </li>
          </ol>
        </Section>

        <Section
          id="projects"
          number="04"
          label="Selected project"
          title="A system, not a single prompt"
          intro="One featured build: an asynchronous, AI-driven educational content authoring backend."
        >
          <article className="project" data-reveal>
            <div className="project-topline">
              <span>Flagship project · AI Engineering Internship</span>
              <span>01 / 01</span>
            </div>
            <div className="project-head">
              <h3>
                Content Generation
                <br />
                System <span>(CGS)</span>
              </h3>
              <div className="project-summary">
                <p className="project-context">
                  A backend system for turning instructor requirements and reference material into course content. The
                  production LMS path drafts PDF-grounded TipTap content; a separate course-agent workflow handles stateful
                  multi-lesson generation. Developed collaboratively within Fusemachines Nepal&apos;s company-owned codebase
                  during my AI Engineering Internship.
                </p>
                <dl className="project-facts">
                  <div>
                    <dt>Problem space</dt>
                    <dd>Coordinate planning, lesson writing, review, revision, and rendering in a structured generation workflow.</dd>
                  </div>
                  <div>
                    <dt>My role</dt>
                    <dd>Contributed to backend and AI workflow engineering for the LMS authoring path and the separate course-agent path; did not independently create or own the full system.</dd>
                  </div>
                  <div>
                    <dt>Technologies</dt>
                    <dd>Python · FastAPI · LangGraph · LLM APIs · Pydantic · PostgreSQL · pgvector</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="architecture">
              <div className="architecture-topline">
                <span>Production LMS authoring path</span>
                <span>High level</span>
              </div>
              <ol className="architecture-flow" aria-label="High-level production LMS authoring request flow">
                {architecture.map((step, index) => (
                  <li key={step}>
                    <span className="architecture-index" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <strong>{step}</strong>
                    {index < architecture.length - 1 ? (
                      <span className="architecture-arrow" aria-hidden="true">
                        →
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>

            <div className="project-footer">
              <span className="private-note">Company-owned private project · source code is not public</span>
              <a className="btn btn-secondary" href="/about">
                Read the technical case study <span aria-hidden="true">↗</span>
              </a>
            </div>
          </article>
        </Section>

        <Section
          id="capabilities"
          number="05"
          label="Skills & capabilities"
          title="What I work with"
          intro="Areas where I have hands-on project exposure or am actively building depth."
        >
          <div className="capability-grid">
            {capabilities.map((capability, index) => (
              <article
                className="capability"
                key={capability.title}
                data-reveal
                style={{ '--reveal-delay': `${index * 70}ms` } as CSSProperties}
              >
                <div className="capability-topline">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <span>Capability</span>
                </div>
                <h3>{capability.title}</h3>
                <ul className="capability-items">
                  {capability.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="capability-note">{capability.note}</p>
              </article>
            ))}
          </div>
          <div className="toolkit" data-reveal>
            <span className="meta-label">Toolkit</span>
            <p>
              Python <em>·</em> FastAPI <em>·</em> PostgreSQL <em>·</em> pgvector <em>·</em> LangGraph <em>·</em> Pydantic{' '}
              <em>·</em> SQLAlchemy
            </p>
          </div>
        </Section>

        <Section
          id="looking-for"
          number="06"
          label="Opportunity"
          title="What I'm looking for"
          intro="A junior role where I can contribute, keep learning, and build useful systems."
        >
          <div className="looking-grid">
            <p className="statement" data-reveal>
              I&apos;m looking for a junior opportunity where I can contribute, keep learning, and build useful systems with a
              thoughtful engineering team.
            </p>
            <div className="looking-body" data-reveal>
              <ol className="role-list">
                {opportunities.map((role, index) => (
                  <li key={role}>
                    <span className="role-index" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>{role}</span>
                    <span className="role-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </li>
                ))}
              </ol>
              <p className="looking-note">
                I bring hands-on project experience and an early-career perspective: curious, collaborative, and ready to
                grow through meaningful work.
              </p>
            </div>
          </div>
        </Section>

        <Section id="contact" number="07" label="Contact" title="Let's connect">
          <div className="contact-grid">
            <div className="contact-intro" data-reveal>
              <p className="statement">
                Interested in working together or discussing a project? I&apos;d be glad to connect.
              </p>
              <a className="contact-email" href="mailto:sudip33khatri@gmail.com">
                sudip33khatri@gmail.com <span aria-hidden="true">↗</span>
              </a>
            </div>
            <dl className="contact-list" data-reveal>
              <div>
                <dt>LinkedIn</dt>
                <dd>
                  <a href="https://linkedin.com/in/sudip-khatri-993b40240" target="_blank" rel="noreferrer">
                    linkedin.com/in/sudip-khatri-993b40240
                  </a>
                </dd>
              </div>
              <div>
                <dt>GitHub</dt>
                <dd>
                  <a href="https://github.com/subtlegrain" target="_blank" rel="noreferrer">
                    github.com/subtlegrain
                  </a>
                </dd>
              </div>
              <div>
                <dt>CV</dt>
                <dd>
                  <a href="/sudip-khatri-cv.pdf" target="_blank" rel="noreferrer">
                    View PDF
                  </a>
                  <span className="contact-separator" aria-hidden="true">
                    ·
                  </span>
                  <a href="/sudip-khatri-cv.pdf" download="Sudip-Khatri-CV.pdf">
                    Download
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </Section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <a className="footer-name" href="#home">
              Sudip Khatri<span>.</span>
            </a>
            <p className="footer-role">AI Engineer · Python Backend Developer</p>
          </div>
          <div className="footer-links">
            <a href="#projects">Projects</a>
            <a href="/about">CGS case study</a>
            <a href="#contact">Contact</a>
            <a className="footer-top" href="#home">
              Back to top ↑
            </a>
          </div>
        </div>
      </footer>

      <ScrollReveal />
    </div>
  )
}
