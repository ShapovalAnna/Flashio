export type Role = 'student' | 'teacher'

export interface Profile {
    id: string
    username: string
    role: Role
    created_at: string
}
// Назва StudySet, а не Set, бо Set уже є вбудованим типом у JavaScript
export interface StudySet {
    id: string
    owner_id: string
    title: string
    description: string | null
    term_lang: string
    definition_lang: string
    is_public: boolean
    created_at: string
}

export interface Card {
  id: string;
  set_id: string;
  term: string;
  definition: string;
  position: number;
  created_at: string;
}

// Картка в редакторі, ще не збережена в базі
export interface CardDraft {
  key: string;
  id?: string; // є лише в карток, які вже збережені в базі
  term: string;
  definition: string;
}