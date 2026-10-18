export type Role = 'student' | 'teacher'

export interface Profile {
    id: string
    username: string
    role: Role
    created_at: string
}