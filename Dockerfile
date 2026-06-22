FROM python:3.12-alpine

WORKDIR /site
COPY . .

EXPOSE 80
CMD ["python", "-m", "http.server", "80", "--directory", "/site"]
