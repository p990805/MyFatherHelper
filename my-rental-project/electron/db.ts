import { PrismaClient } from '@prisma/client'

// DB 클라이언트를 하나만 만들어서 재사용 (싱글톤 패턴)
export const prisma = new PrismaClient()

// 연결 테스트용 함수
export async function connectDB() {
  try {
    await prisma.$connect()
    console.log('✅ 데이터베이스 연결 성공!')
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error)
  }
}