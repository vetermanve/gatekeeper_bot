# gatekeeper_bot

Бот, который будет выкидывать молчунов через 30 минут после их появления в чате.
Создан https://t.me/vetermanve

### Собрать и запушить вашу версию

`docker build -t vetermanve/gatekeeper:latest -f .docker/Dockerfile .`
`docker push  vetermanve/gatekeeper:latest`

### Запустить на сервере
`docker run --env 'BOT_TOKEN={YOUR_TOKEN_HERE}' -d --restart unless-stopped vetermanve/gatekeeper:latest`