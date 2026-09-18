export const QUESTIONS = [
    { key: 'color', question: 'What is your favorite color?' },
    { key: 'firstSurvey', question: 'Are pineapples on pizza acceptable?' },
    { key: 'wouldRather', question: 'Would you rather have…' },
    { key: 'animalRoommate', question: 'What animal would be the worst roommate?' },
    { key: 'tacoCount', question: 'How many tacos could you eat in one sitting?' },
    { key: 'incon', question: 'Which minor inconvenience would you eliminate forever?' },
    { key: 'feedback', question: 'How would you rate this survey?' },
] as const;

export type QuestionKey = typeof QUESTIONS[number]['key'];
export interface AnswerInput { questionKey: QuestionKey; answer: string | null; }
