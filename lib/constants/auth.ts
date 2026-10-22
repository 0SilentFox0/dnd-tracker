export const PASSWORD_MIN_LENGTH = 8;

export const AFTER_SIGN_IN_PATH = "/campaigns";

export const RESET_PASSWORD_PATH = "/reset-password";

// Supabase Auth error codes (and the callback's own codes) → what the user should read
export const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: "Невірний email або пароль",
  email_not_confirmed: "Пошту ще не підтверджено — перейдіть за посиланням з листа",
  user_already_exists: "Акаунт з цим email уже існує — увійдіть або відновіть пароль",
  email_exists: "Акаунт з цим email уже існує — увійдіть або відновіть пароль",
  weak_password: `Пароль заслабкий: щонайменше ${PASSWORD_MIN_LENGTH} символів, краще з цифрами й літерами`,
  same_password: "Новий пароль має відрізнятися від поточного",
  email_address_invalid: "Некоректна адреса пошти",
  signup_disabled: "Реєстрацію тимчасово вимкнено",
  over_email_send_rate_limit: "Забагато листів за короткий час — спробуйте за кілька хвилин",
  over_request_rate_limit: "Забагато спроб — зачекайте трохи й спробуйте ще раз",
  otp_expired: "Посилання застаріло або вже використане — надішліть новий лист",
  flow_state_not_found: "Відкрийте посилання з листа в тому ж браузері, де робили запит",
  bad_code_verifier: "Відкрийте посилання з листа в тому ж браузері, де робили запит",
  session_not_found: "Сесія завершилась — увійдіть знову",
  reauthentication_needed: "Для зміни пароля увійдіть знову",
  access_denied: "Доступ скасовано",
  provider_disabled: "Цей спосіб входу не налаштований — зверніться до адміністратора",
  no_code: "Посилання для входу неповне — спробуйте ще раз",
  exchange_failed: "Не вдалося завершити вхід — спробуйте ще раз",
  user_not_found: "Користувача не знайдено",
  unexpected: "Щось пішло не так — спробуйте ще раз",
};

export const AUTH_FALLBACK_ERROR = "Не вдалося виконати дію — спробуйте ще раз";
