// Fill these in from Supabase Dashboard > Project Settings > API,
// after creating the project and running supabase_schema.sql.
var SUPABASE_URL = "https://iqidwttxxdlojoxzidvr.supabase.co";
var SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxaWR3dHR4eGRsb2pveHppZHZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5ODE3ODUsImV4cCI6MjEwNzU1Nzc4NX0.9XUBkU_zWvMwMhFLP7YG-5thTH2RKX5uLSWE47XsfsI";

// 관리자 로그인 아이디 뒤에 자동으로 붙는 이메일 도메인 (admin.html에서 사용)
var ADMIN_LOGIN_DOMAIN = "naver.com";

// 공지사항 "블로그에서 가져오기"에 사용하는 네이버 블로그 아이디 (notice.html)
var NAVER_BLOG_ID = "thebeautycl";

var supabaseClient =
  SUPABASE_ANON_KEY.indexOf("YOUR-ANON-PUBLIC-KEY") === -1 &&
  typeof window.supabase !== "undefined"
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
