import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { userRepository } from '../repositories/user.repository.js'

export const authService = {
  async register(name: string, email: string, password: string) {
    const existing = await userRepository.findByEmail(email)
    if (existing) throw new Error('Email already in use')
    const hashed = await bcrypt.hash(password, 10)
    const user = await userRepository.create({ name, email, password: hashed })
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' })
    return { token, user: { id: user.id, name: user.name, email: user.email } }
  },

  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email)
    if (!user) throw new Error('Invalid credentials')
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) throw new Error('Invalid credentials')
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' })
    return { token, user: { id: user.id, name: user.name, email: user.email } }
  },

  async getProfile(userId: number) {
    const user = await userRepository.findById(userId)
    if (!user) throw new Error('User not found')
    return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }
  },
}
