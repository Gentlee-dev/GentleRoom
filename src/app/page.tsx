import { RequestForm } from "./request-form";

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">요청사항 작성</h1>
        <p className="mt-1 text-sm opacity-70">
          질문·오류·행정 요청을 남겨주세요. 접수 순서와 긴급도에 따라 처리됩니다.
          에러 메시지는 캡처보다 <b>텍스트 복사</b>가 훨씬 빨리 해결돼요.
        </p>
      </div>
      <RequestForm />
    </div>
  );
}
