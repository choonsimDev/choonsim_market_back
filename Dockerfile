# Node.js 이미지를 기반으로 합니다.
FROM node:20

# 작업 디렉터리를 설정합니다.
WORKDIR /usr/src/app

# 소스 코드를 복사합니다.
COPY . .

# npm 패키지를 설치합니다.
RUN npm install

# 빌드를 실행합니다.
RUN npm run build

# entrypoint.sh 스크립트를 복사하고 실행 권한을 부여합니다.
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# 필요한 포트를 엽니다.
EXPOSE 8080

# 컨테이너 시작 시 실행할 명령어를 설정합니다.
CMD ["/usr/local/bin/entrypoint.sh"]
