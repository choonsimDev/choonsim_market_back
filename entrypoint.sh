#!/bin/sh

# 환경 변수를 로드합니다.
export $(grep -v '^#' .env | xargs)

# Prisma 클라이언트를 생성합니다.
npx prisma generate

# Node.js 애플리케이션을 시작합니다.
npm run start
