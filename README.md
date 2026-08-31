# ことば 노트

정적 일본어 문장 보관함과 Git 기반 관리 CLI.

웹사이트는 문장 열람·검색·퀴즈만 제공한다. 문장과 단어는 관리 CLI가 저장소의 `data/lessons.json`을 변경하고 GitHub에 push하는 방식으로 관리한다. 별도 서버, 데이터베이스, 웹 로그인 기능 없음.

## 여러 컴퓨터에서 시작

각 컴퓨터에서 본인의 GitHub SSH 키로 저장소를 복제하고, Node.js 20 이상을 설치한다.

```bash
git clone git@github.com:dkjung/daek-nihongo.git
cd daek-nihongo
npm install
npm link
```

이후 어느 컴퓨터에서나 `nihongo` 명령을 실행할 수 있다. 각 컴퓨터의 SSH 공개키가 GitHub 계정에 등록되어 있고 저장소 접근 권한이 있어야 한다.

## 학습 파일

JSON 또는 YAML 파일을 사용한다. 필수 항목은 `japanese`, `meaning`이며, 읽기·메모·단어는 선택 항목이다.

```yaml
sentences:
  - japanese: 台風の影響で、配送が遅れました。
    meaning: 태풍의 영향으로 배송이 늦어졌습니다.
    reading: たいふうのえいきょうで、はいそうがおくれました。
    note: 공식 안내문 표현
    words:
      - japanese: 配送
        meaning: 배송
        reading: はいそう
```

## CLI

```bash
nihongo validate sentences.yaml
nihongo import sentences.yaml --dry-run
nihongo import sentences.yaml
nihongo list --query 配送
nihongo update sent-delivery revision.yaml
nihongo delete sent-delivery
nihongo export backup.json
```

`import`, `update`, `delete`는 최신 원격 변경을 먼저 반영하고, 데이터 파일을 commit·push한다. `--no-push`를 붙이면 commit까지만 수행한다. GitHub에 push된 변경은 정적 웹사이트 배포 작업을 시작한다.

## 로컬 확인

```bash
npm test
npm run check
npm run serve
```

브라우저에서 `http://localhost:4173` 접속.
