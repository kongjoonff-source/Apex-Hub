이 폴더에 이미지를 넣고 config.js 에 경로를 적으면 사이트에 표시됩니다.

■ 이미지 교체 방법
1) 이미지 파일을 이 폴더(assets/images)에 넣습니다.
   - 파일명은 영어 소문자 + 하이픈 권장. 예) shot-1.png / event.png
   - 한글 파일명은 GitHub Pages 에서 깨질 수 있습니다.
2) config.js 를 열어 경로를 수정합니다.

   server: {
     logo:   "assets/images/logo.png",     // 로고 (정사각형 권장, 512x512)
     banner: "assets/images/banner.png"    // 상단 배너 (가로로 긴 이미지 권장, 1200x420)
   },
   gallery: [
     { src: "assets/images/shot-1.png", caption: "구매 화면" },
     { src: "assets/images/shot-2.png", caption: "가격표" }
   ]

■ 권장 크기
- 로고        : 512 x 512 (정사각형)
- 상단 배너   : 1200 x 420 (가로)
- 갤러리 이미지: 1200 x 750 (가로 16:10)
- 용량은 1장당 500KB 이하를 권장합니다. (사이트가 느려집니다)

■ 현재 들어있는 파일
- logo.svg      : 예시 로고 (교체 권장)
- banner.svg    : 예시 배너 (교체 권장)
- shot-1~4.svg  : 예시 갤러리 이미지 (교체 권장)

※ 이미지 파일이 없으면 자동으로 숨겨지므로 사이트가 깨지지 않습니다.
