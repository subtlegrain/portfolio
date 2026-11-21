import type { Course, Feedback, GenerationSession, User } from './cgs-types'

export const demoUser: User = { id: 'u-01', name: 'Alex Morgan', email: 'alex.morgan@example.com' }
export const demoCourse: Course = {
  id: 'c-01', title: 'Foundations of Climate Science', audience: 'Undergraduate students', level: 'Intermediate',
  description: 'A clear, evidence-based introduction to the systems that shape our changing climate.',
  objectives: ['Explain the greenhouse effect and Earth’s energy balance', 'Interpret key climate indicators and datasets', 'Evaluate mitigation and adaptation strategies'],
  modules: [
    { id: 'm1', title: 'Understanding our climate system', lessons: [
      { id: 'l1', title: 'Earth’s energy balance', duration: '12 min', status: 'ready', description: 'Explore how incoming and outgoing energy shapes global temperatures.', outcomes: ['Describe incoming solar radiation', 'Explain the role of albedo'], content: ['A system in balance', 'Earth receives energy from the Sun and returns energy to space. The temperature we experience depends on the relationship between these incoming and outgoing flows.', 'The greenhouse effect', 'Certain atmospheric gases absorb and re-emit infrared radiation. This natural process keeps Earth warm enough for life; changes in greenhouse gas concentrations alter the balance.'] },
      { id: 'l2', title: 'The atmosphere as a system', duration: '15 min', status: 'ready', description: 'Meet the atmospheric layers and gases that influence climate.', outcomes: ['Identify major atmospheric layers', 'Distinguish weather from climate'], content: ['A thin, dynamic envelope', 'The atmosphere is a mix of gases held close to Earth by gravity. Although it extends hundreds of kilometers, most of its mass sits in the lowest layer.', 'Weather and climate', 'Weather describes short-term conditions. Climate is the pattern of weather over longer periods, usually assessed across decades.'] },
      { id: 'l3', title: 'Reading climate evidence', duration: '18 min', status: 'draft', description: 'Connect observations to long-term climate patterns.', outcomes: ['Compare proxy and instrumental records', 'Read a temperature anomaly chart'], content: ['From observations to evidence', 'Scientists combine direct measurements with natural archives such as ice cores and tree rings to understand climate across different timescales.'] },
    ] },
    { id: 'm2', title: 'Evidence of a changing climate', lessons: [
      { id: 'l4', title: 'Global temperature trends', duration: '14 min', status: 'pending', description: 'Examine the global temperature record and its context.', outcomes: ['Define a temperature anomaly', 'Identify a long-term trend'], content: ['Seeing the signal', 'A global temperature anomaly compares a given period with a chosen reference average. The reference is a baseline, not a target.'] },
      { id: 'l5', title: 'Oceans, ice, and sea level', duration: '16 min', status: 'pending', description: 'Explore interconnected changes across the Earth system.', outcomes: ['Describe thermal expansion', 'Connect ice loss to sea level'], content: ['A connected system', 'The ocean stores most of the excess heat in the climate system. Warming water expands, while melting land ice adds water to the ocean.'] },
    ] },
    { id: 'm3', title: 'Responses and solutions', lessons: [
      { id: 'l6', title: 'Pathways to mitigation', duration: '20 min', status: 'pending', description: 'Compare approaches to reducing greenhouse gas emissions.', outcomes: ['Define mitigation', 'Assess a trade-off'], content: ['Reducing net emissions', 'Mitigation includes actions that reduce sources or enhance sinks of greenhouse gases. Effective pathways combine multiple approaches.'] },
    ] },
  ],
}
export const demoSessions: GenerationSession[] = [
  { id: 's1', course: demoCourse, status: 'reviewing_outline', updatedAt: 'Updated 12 minutes ago', stage: 'Outline ready for review' },
  { id: 's2', course: { ...demoCourse, id: 'c2', title: 'Designing Inclusive Learning Experiences' }, status: 'generating_lessons', updatedAt: 'Updated yesterday', stage: 'Generating lesson 4 of 8' },
  { id: 's3', course: { ...demoCourse, id: 'c3', title: 'Introduction to Behavioral Economics' }, status: 'completed', updatedAt: 'Updated 3 days ago', stage: 'All lessons generated' },
]
export let demoFeedback: Feedback[] = []
export const mockAuth = { async signIn(email: string, _password: string) { await new Promise((r) => setTimeout(r, 500)); if (!email.includes('@')) throw new Error('Enter a valid email address.'); return demoUser } }
export const courseService = {
  async getRecentSessions() { return demoSessions },
  async createSession(input: Pick<Course, 'title' | 'audience' | 'level' | 'objectives' | 'structure' | 'instructions'>) { return { id: `s${Date.now()}`, course: { ...demoCourse, ...input, description: `A guided course outline for ${input.audience.toLowerCase()} focused on ${input.title}.`, id: `c${Date.now()}` }, status: 'clarification_required' as const, updatedAt: 'Just now', stage: 'Clarification needed' } },
  async submitFeedback(lessonId: string, note: string) { const item = { id: `f${Date.now()}`, lessonId, note, status: 'submitted' as const, createdAt: 'Just now' }; demoFeedback = [item, ...demoFeedback]; return item },
}
