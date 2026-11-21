export type GenerationStatus = 'initializing' | 'clarification_required' | 'drafting_outline' | 'reviewing_outline' | 'generating_lessons' | 'reviewing_content' | 'completed' | 'failed' | 'cancelled'
export type User = { id: string; name: string; email: string }
export type Lesson = { id: string; title: string; duration: string; status: 'ready' | 'draft' | 'pending'; description: string; outcomes: string[]; content: string[] }
export type CourseModule = { id: string; title: string; lessons: Lesson[] }
export type Course = { id: string; title: string; audience: string; level: string; description: string; objectives: string[]; structure?: string; instructions?: string; modules: CourseModule[] }
export type GenerationSession = { id: string; course: Course; status: GenerationStatus; updatedAt: string; stage: string }
export type ClarificationQuestion = { id: string; prompt: string; type: 'single' | 'text'; options?: string[]; answer?: string }
export type Feedback = { id: string; lessonId: string; note: string; status: 'submitted' | 'resolved'; createdAt: string }
