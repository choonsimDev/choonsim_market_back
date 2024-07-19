# Node.js 이미지를 기반으로 합니다.
FROM node:20

# 작업 디렉터리를 설정합니다.
WORKDIR /app

# 패키지 파일들을 복사합니다.
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

# npmjs.org 레지스트리를 사용한다고 알립니다.
RUN echo "use npmjs.org registry"

# npm 패키지를 설치합니다.
RUN npm install

# PlanetScale CLI를 설치합니다.
RUN npm install -g @planetscale/cli

# 앱 소스 코드를 복사합니다.
COPY . .

# 서비스 토큰을 환경 변수로 사용하여 PlanetScale에 로그인하고 Prisma 클라이언트를 생성합니다.
RUN pscale auth login --service-token $PLANETSCALE_SERVICE_TOKEN
RUN pscale connect mobick-simboorum main --port 3306 --execute "npx prisma generate && npx prisma migrate deploy"

# 앱을 시작합니다.
CMD ["npm", "start"]
