# Node.js 이미지를 기반으로 합니다.
FROM node:20

# 작업 디렉터리를 설정합니다.
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# 소스 코드를 복사합니다.
COPY . .

# npm 패키지를 설치합니다.
RUN npm install

# PlanetScale CLI를 직접 다운로드하여 설치합니다.
RUN curl -L https://github.com/planetscale/cli/releases/download/v0.205.0/pscale_0.205.0_linux_amd64.tar.gz -o pscale.tar.gz \
    && tar -xzf pscale.tar.gz -C /usr/local/bin pscale \
    && rm pscale.tar.gz

# 빌드를 실행합니다.
RUN npm run build

# 필요한 포트를 엽니다.
EXPOSE 8080

# PlanetScale에 로그인하고 데이터베이스를 연결하는 스크립트를 작성합니다.
RUN echo '#!/bin/sh\n\
export $(cat .env | xargs)\n\
pscale auth login --service-token $PLANETSCALE_SERVICE_TOKEN\n\
pscale connect mobick-simboorum main --port 3306 --execute "npx prisma generate"\n\
npm run start' > /usr/src/app/start.sh

# 실행 권한을 부여합니다.
RUN chmod +x /usr/src/app/start.sh

# 컨테이너 시작 시 실행할 명령어를 설정합니다.
CMD ["/usr/src/app/start.sh"]
