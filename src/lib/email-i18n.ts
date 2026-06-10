// All user-visible server-rendered strings (emails + in-app inbox
// messages + a few API error responses), in the four locales the UI
// supports. Keep keys flat per group — referenced by name from the
// matching sender / route. The English copy is the canonical source
// for translators (registrationDuplicate's canonical source is RU,
// per its original hand-written wording).
//
// Placeholder syntax: {name} — replaced at render time by `t()`.

export type EmailLocale = "en" | "ru" | "et" | "es";
const LOCALES: readonly EmailLocale[] = ["en", "ru", "et", "es"] as const;

export function normaliseLocale(input: string | null | undefined): EmailLocale {
  if (!input) return "en";
  const lo = input.toLowerCase().slice(0, 2);
  return (LOCALES as readonly string[]).includes(lo) ? (lo as EmailLocale) : "en";
}

type Dict = Record<EmailLocale, string>;

export const EMAIL_STRINGS = {
  // ─── Welcome ───────────────────────────────────────────────
  welcome: {
    subject:    { en: "Welcome to Goality — {clubName} is ready 🎉", ru: "Добро пожаловать в Goality — клуб {clubName} готов 🎉", et: "Tere tulemast Goalitysse — {clubName} on valmis 🎉", es: "Bienvenido a Goality — {clubName} está listo 🎉" },
    hi:         { en: "Hi {name},",                                    ru: "Здравствуйте, {name},",                                    et: "Tere, {name},",                                              es: "Hola {name}," },
    body1:      { en: "Welcome to Goality! Your club <strong>{clubName}</strong> has been successfully registered.", ru: "Добро пожаловать в Goality! Ваш клуб <strong>{clubName}</strong> успешно зарегистрирован.", et: "Tere tulemast Goalitysse! Teie klubi <strong>{clubName}</strong> on edukalt registreeritud.", es: "¡Bienvenido a Goality! Tu club <strong>{clubName}</strong> se ha registrado correctamente." },
    cta:        { en: "Open your cabinet",                             ru: "Открыть кабинет",                                          et: "Ava kabinet",                                                es: "Abrir mi panel" },
    signature:  { en: "Goality Team",                                  ru: "Команда Goality",                                          et: "Goality meeskond",                                           es: "Equipo Goality" },
    preheader:  { en: "Your club is ready on Goality.",                ru: "Ваш клуб готов в Goality.",                                et: "Teie klubi on Goalitys valmis.",                             es: "Tu club está listo en Goality." },
  },

  // ─── Password reset ────────────────────────────────────────
  passwordReset: {
    subject:    { en: "Reset your Goality password", ru: "Сброс пароля Goality", et: "Lähtesta Goality parool", es: "Restablecer tu contraseña de Goality" },
    title:      { en: "Password Reset Request",      ru: "Запрос на сброс пароля", et: "Parooli lähtestamise taotlus", es: "Solicitud de restablecimiento" },
    body1:      { en: "Hi <strong>{name}</strong>, we received a request to reset the password for your Goality account. Click the button below to set a new password.", ru: "Здравствуйте, <strong>{name}</strong>! Получен запрос на сброс пароля. Нажмите кнопку ниже, чтобы задать новый пароль.", et: "Tere <strong>{name}</strong>! Saime parooli lähtestamise taotluse. Klõpsa allolevat nuppu, et seada uus parool.", es: "Hola <strong>{name}</strong>, recibimos una solicitud para restablecer la contraseña. Haz clic abajo para establecer una nueva." },
    expires:    { en: "This link expires in <strong>1 hour</strong>. If you didn't request a reset, you can safely ignore this email — your password won't change.", ru: "Ссылка действует <strong>1 час</strong>. Если вы не запрашивали сброс — просто проигнорируйте письмо, пароль не изменится.", et: "Link kehtib <strong>1 tund</strong>. Kui te ei taotlenud lähtestamist — jätke kiri tähelepanuta, parool ei muutu.", es: "El enlace caduca en <strong>1 hora</strong>. Si no solicitaste el restablecimiento, ignora este correo — tu contraseña no cambiará." },
    cta:        { en: "Reset My Password",           ru: "Сбросить пароль",        et: "Lähtesta parool",            es: "Restablecer contraseña" },
    preheader:  { en: "Reset your Goality password — link valid for 1 hour.", ru: "Сброс пароля Goality — ссылка действует 1 час.", et: "Lähtesta Goality parool — link kehtib 1 tund.", es: "Restablece tu contraseña de Goality — enlace válido 1 hora." },
  },

  // ─── Email verification code ───────────────────────────────
  verifyCode: {
    subject:    { en: "Your Goality verification code: {code}", ru: "Ваш код подтверждения Goality: {code}", et: "Teie Goality kinnituskood: {code}", es: "Tu código de verificación Goality: {code}" },
    title:      { en: "Confirm your email",                       ru: "Подтвердите email",                       et: "Kinnita oma e-post",                       es: "Confirma tu email" },
    body1:      { en: "Use this code to finish creating your Goality account:", ru: "Используйте этот код, чтобы завершить регистрацию в Goality:", et: "Kasuta seda koodi, et lõpetada Goality konto loomine:", es: "Usa este código para completar la creación de tu cuenta Goality:" },
    expires:    { en: "This code expires in <strong>15 minutes</strong>. If you didn't request it, ignore this email — no account will be created.", ru: "Код действует <strong>15 минут</strong>. Если вы не запрашивали его — просто проигнорируйте письмо, аккаунт не будет создан.", et: "Kood kehtib <strong>15 minutit</strong>. Kui te ei taotlenud seda — jätke kiri tähelepanuta, kontot ei looda.", es: "El código caduca en <strong>15 minutos</strong>. Si no lo solicitaste, ignora este correo — no se creará ninguna cuenta." },
    preheader:  { en: "Verification code {code} — valid for 15 minutes.", ru: "Код подтверждения {code} — действует 15 минут.", et: "Kinnituskood {code} — kehtib 15 minutit.", es: "Código de verificación {code} — válido 15 minutos." },
    fallbackText: { en: "Your verification code is {code}.\n\nIt expires in 15 minutes. If you didn't request this, ignore the email.", ru: "Ваш код подтверждения: {code}.\n\nДействует 15 минут. Если вы не запрашивали — проигнорируйте письмо.", et: "Teie kinnituskood: {code}.\n\nKehtib 15 minutit. Kui te ei taotlenud — jätke kiri tähelepanuta.", es: "Tu código de verificación: {code}.\n\nVálido 15 minutos. Si no lo solicitaste, ignora este correo." },
  },

  // ─── Coach joined the club (admin notification) ──────────
  coachJoined: {
    subject:    { en: "New coach joined {clubName}: {who}", ru: "Новый тренер в клубе {clubName}: {who}", et: "Uus treener klubis {clubName}: {who}", es: "Nuevo entrenador en {clubName}: {who}" },
    title:      { en: "New coach joined your club",          ru: "Новый тренер в вашем клубе",                et: "Uus treener teie klubis",                  es: "Nuevo entrenador en tu club" },
    body:       { en: "<strong>{coach}</strong> just joined <strong>{clubName}</strong> as coach of <strong>{teamLabel}</strong>.", ru: "<strong>{coach}</strong> только что присоединился к клубу <strong>{clubName}</strong> как тренер <strong>{teamLabel}</strong>.", et: "<strong>{coach}</strong> liitus just klubiga <strong>{clubName}</strong> meeskonna <strong>{teamLabel}</strong> treenerina.", es: "<strong>{coach}</strong> acaba de unirse a <strong>{clubName}</strong> como entrenador del equipo <strong>{teamLabel}</strong>." },
    emailLabel: { en: "Email",                               ru: "Email",                                     et: "E-post",                                    es: "Email" },
    note:       { en: "They can already register and manage this team for tournaments. If you don't recognise them, you can remove them from the club dashboard. The person who registers a team is responsible for it.", ru: "Тренер уже может регистрировать и управлять этой командой на турнирах. Если вы не знаете этого человека — удалите его в кабинете клуба. Кто регистрирует команду — тот за неё отвечает.", et: "Treener saab juba selle meeskonnaga turniiridel registreerida ja seda hallata. Kui te teda ei tunne — eemaldage ta klubi armatuurlaualt. Kes meeskonna registreerib, see vastutab selle eest.", es: "Ya puede registrar y gestionar este equipo en torneos. Si no lo reconoces, puedes eliminarlo desde el panel del club. Quien registra un equipo es responsable de él." },
    cta:        { en: "Open Club Dashboard",                 ru: "Открыть кабинет клуба",                     et: "Ava klubi armatuurlaud",                    es: "Abrir panel del club" },
    preheader:  { en: "{who} joined {clubName} — confirm or remove on the dashboard.", ru: "{who} присоединился к {clubName} — подтвердите или удалите в кабинете.", et: "{who} liitus klubiga {clubName} — kinnitage või eemaldage armatuurlaual.", es: "{who} se unió a {clubName} — confirma o elimina desde el panel." },
  },

  // ─── Club invite (manager / coach) ────────────────────────
  clubInvite: {
    subject:    { en: "You've been invited to join {clubName} on Goality", ru: "Вас пригласили в клуб {clubName} на Goality",        et: "Teid kutsuti liituma klubiga {clubName} Goalitys",            es: "Te invitaron a {clubName} en Goality" },
    title:      { en: "You're invited to {clubName}",                       ru: "Приглашение в клуб {clubName}",                      et: "Kutse klubisse {clubName}",                                   es: "Invitación a {clubName}" },
    body:       { en: "{inviter} invited you to manage <strong>{clubName}</strong> on Goality. Accept the invite to set your password and access the club cabinet.", ru: "{inviter} пригласил вас управлять клубом <strong>{clubName}</strong> на Goality. Примите приглашение, чтобы задать пароль и войти в кабинет клуба.", et: "{inviter} kutsus teid haldama klubi <strong>{clubName}</strong> Goalitys. Võtke kutse vastu, et seada parool ja siseneda klubi kabinetti.", es: "{inviter} te invitó a gestionar <strong>{clubName}</strong> en Goality. Acepta la invitación para establecer tu contraseña y acceder al panel del club." },
    expires:    { en: "Link valid for 7 days.",                             ru: "Ссылка действует 7 дней.",                           et: "Link kehtib 7 päeva.",                                        es: "Enlace válido por 7 días." },
    cta:        { en: "Accept Invitation",                                  ru: "Принять приглашение",                                et: "Võta kutse vastu",                                            es: "Aceptar invitación" },
    preheader:  { en: "Manager invitation to {clubName} — valid 7 days.",    ru: "Приглашение менеджера в {clubName} — 7 дней.",       et: "Halduri kutse klubisse {clubName} — 7 päeva.",                es: "Invitación de gestor a {clubName} — 7 días." },
  },

  // ─── Org-admin invite ─────────────────────────────────────
  orgAdminInvite: {
    subject:    { en: "You've been invited to administer {orgName} on Goality", ru: "Вас пригласили администрировать {orgName} в Goality", et: "Teid kutsuti haldama {orgName} Goalitys",                       es: "Invitación a administrar {orgName} en Goality" },
    title:      { en: "Co-admin invitation",                                     ru: "Приглашение со-администратора",                       et: "Kaashalduri kutse",                                              es: "Invitación de co-administrador" },
    body:       { en: "{inviter} invited you to administer <strong>{orgName}</strong> on Goality.",                                ru: "{inviter} пригласил вас администрировать <strong>{orgName}</strong> в Goality.",                                et: "{inviter} kutsus teid haldama <strong>{orgName}</strong> Goalitys.",                                es: "{inviter} te invitó a administrar <strong>{orgName}</strong> en Goality." },
    expires:    { en: "Link valid for 7 days.",                                  ru: "Ссылка действует 7 дней.",                            et: "Link kehtib 7 päeva.",                                            es: "Enlace válido por 7 días." },
    cta:        { en: "Accept & Set Password",                                   ru: "Принять и задать пароль",                             et: "Võta vastu ja sea parool",                                       es: "Aceptar y crear contraseña" },
    preheader:  { en: "Admin invitation to {orgName} — valid 7 days.",            ru: "Приглашение админа в {orgName} — 7 дней.",            et: "Halduri kutse {orgName} — 7 päeva.",                              es: "Invitación de admin a {orgName} — 7 días." },
  },

  // ─── Registration received (initial application receipt) ─
  regReceived: {
    subject:    { en: "Application received — {tournamentName}",                              ru: "Заявка получена — {tournamentName}",                                  et: "Avaldus kätte saadud — {tournamentName}",                              es: "Solicitud recibida — {tournamentName}" },
    title:      { en: "Application received",                                                  ru: "Заявка получена",                                                     et: "Avaldus kätte saadud",                                                  es: "Solicitud recibida" },
    body:       { en: "Hi <strong>{clubName}</strong>, we received <strong>{teamName}</strong>'s application for <strong>{tournamentName}</strong>. The organizer will review it shortly.", ru: "Здравствуйте, <strong>{clubName}</strong>! Мы получили заявку команды <strong>{teamName}</strong> на турнир <strong>{tournamentName}</strong>. Организатор скоро её рассмотрит.", et: "Tere <strong>{clubName}</strong>! Saime <strong>{teamName}</strong> avalduse turniirile <strong>{tournamentName}</strong>. Korraldaja vaatab selle peagi üle.", es: "Hola <strong>{clubName}</strong>, recibimos la solicitud de <strong>{teamName}</strong> para <strong>{tournamentName}</strong>. El organizador la revisará pronto." },
    body2:      { en: "We'll email you again once a decision is made.",                       ru: "Когда решение будет принято — мы пришлём ещё одно письмо.",            et: "Kui otsus on tehtud, saadame teile uue kirja.",                       es: "Te enviaremos otro correo cuando se tome una decisión." },
    cta:        { en: "Open Team Portal",                                                      ru: "Открыть кабинет команд",                                              et: "Ava meeskondade kabinet",                                              es: "Abrir panel de equipos" },
    preheader:  { en: "Application for {tournamentName} received — awaiting organizer review.", ru: "Заявка на {tournamentName} получена — ждём решения организатора.",     et: "Avaldus turniirile {tournamentName} kätte saadud — ootame korraldaja otsust.", es: "Solicitud para {tournamentName} recibida — esperando al organizador." },
  },

  // ─── Registration confirmed ────────────────────────────────
  regConfirmed: {
    // No emoji in subject — Apple Mail Junk filter is allergic to the
    // ✅ glyph in transactional mail and routes batches to spam.
    subject:    { en: "Confirmed — {teamName} is in {tournamentName}",                                  ru: "Подтверждено — {teamName} в турнире {tournamentName}",                                      et: "Kinnitatud — {teamName} on {tournamentName} osaleja",                                          es: "Confirmado — {teamName} está en {tournamentName}" },
    bannerTitle:{ en: "You're confirmed!",                                                                 ru: "Вы подтверждены!",                                                                            et: "Olete kinnitatud!",                                                                            es: "¡Estás confirmado!" },
    bannerSub:  { en: "{teamName} has a spot in {tournamentName}",                                         ru: "Команда {teamName} получила место в {tournamentName}",                                        et: "Meeskond {teamName} on {tournamentName} osaleja",                                              es: "{teamName} tiene un lugar en {tournamentName}" },
    body1:      { en: "Hi <strong>{clubName}</strong>,",                                                   ru: "Здравствуйте, <strong>{clubName}</strong>!",                                                  et: "Tere <strong>{clubName}</strong>!",                                                            es: "Hola <strong>{clubName}</strong>," },
    body2:      { en: "Great news — <strong>{teamName}</strong> has been officially confirmed for <strong>{tournamentName}</strong>! Your team is in.", ru: "Отличная новость — команда <strong>{teamName}</strong> официально подтверждена в <strong>{tournamentName}</strong>! Команда в турнире.", et: "Suurepärane uudis — <strong>{teamName}</strong> on ametlikult <strong>{tournamentName}</strong> osaleja! Meeskond on sees.", es: "¡Buenas noticias! <strong>{teamName}</strong> ha sido confirmado oficialmente en <strong>{tournamentName}</strong>. Tu equipo está dentro." },
    rowClub:    { en: "Club",                                                                              ru: "Клуб",                                                                                        et: "Klubi",                                                                                        es: "Club" },
    rowTeam:    { en: "Team",                                                                              ru: "Команда",                                                                                     et: "Meeskond",                                                                                     es: "Equipo" },
    rowTournament:{ en: "Tournament",                                                                      ru: "Турнир",                                                                                      et: "Turniir",                                                                                      es: "Torneo" },
    rowStatus:  { en: "Status",                                                                            ru: "Статус",                                                                                      et: "Staatus",                                                                                      es: "Estado" },
    statusBadge:{ en: "Confirmed",                                                                          ru: "Подтверждено",                                                                                et: "Kinnitatud",                                                                                    es: "Confirmado" },
    noteLabel:  { en: "Note from organizer",                                                                ru: "Комментарий организатора",                                                                    et: "Korraldaja märkus",                                                                             es: "Nota del organizador" },
    cta:        { en: "Open Team Portal →",                                                                 ru: "Открыть кабинет команд →",                                                                    et: "Ava meeskondade kabinet →",                                                                     es: "Abrir panel de equipos →" },
    preheader:  { en: "Great news! {teamName} has been confirmed for {tournamentName}.",                    ru: "Отличная новость! Команда {teamName} подтверждена в {tournamentName}.",                       et: "Suurepärane uudis! {teamName} on {tournamentName} kinnitatud.",                                  es: "¡Buenas noticias! {teamName} ha sido confirmado en {tournamentName}." },
    footer:     { en: "Open your team portal to access tournament details, schedule, and communicate with the organizer.", ru: "Откройте кабинет команд, чтобы посмотреть детали турнира, расписание и связаться с организатором.", et: "Ava meeskondade kabinet, et näha turniiri detaile, ajakava ja suhelda korraldajaga.", es: "Abre el panel de equipos para ver los detalles del torneo, el calendario y comunicarte con el organizador." },
  },

  // ─── Registration rejected ────────────────────────────────
  regRejected: {
    subject:    { en: "Update on your application — {tournamentName}",                                            ru: "Решение по заявке — {tournamentName}",                                                          et: "Otsus avalduse kohta — {tournamentName}",                                                          es: "Decisión sobre tu solicitud — {tournamentName}" },
    title:      { en: "Application Update",                                                                        ru: "Решение по заявке",                                                                              et: "Avalduse otsus",                                                                                    es: "Actualización de solicitud" },
    body:       { en: "Hi <strong>{clubName}</strong>, we're sorry to let you know that <strong>{teamName}</strong>'s application for <strong>{tournamentName}</strong> was not accepted at this time. The organizer may have reached capacity or had other requirements.", ru: "Здравствуйте, <strong>{clubName}</strong>! С сожалением сообщаем, что заявка команды <strong>{teamName}</strong> на <strong>{tournamentName}</strong> не была принята. Возможно, организатор уже набрал лимит или были другие требования.", et: "Tere <strong>{clubName}</strong>! Kahjuks teatame, et <strong>{teamName}</strong> avaldust turniirile <strong>{tournamentName}</strong> sel korral vastu ei võetud. Korraldaja võis täituda või seada muid nõudeid.", es: "Hola <strong>{clubName}</strong>, lamentamos informarte que la solicitud de <strong>{teamName}</strong> para <strong>{tournamentName}</strong> no fue aceptada esta vez. Puede que el organizador haya alcanzado el cupo o tuviera otros requisitos." },
    noteLabel:  { en: "Message from organizer",                                                                    ru: "Сообщение от организатора",                                                                      et: "Korraldaja sõnum",                                                                                  es: "Mensaje del organizador" },
    body2:      { en: "You can browse other open tournaments in the catalog.",                                     ru: "Загляните в каталог — там много других открытых турниров.",                                       et: "Vaadake kataloogist teisi avatud turniire.",                                                        es: "Puedes ver otros torneos abiertos en el catálogo." },
    cta:        { en: "Browse Tournaments",                                                                         ru: "Каталог турниров",                                                                               et: "Sirvi turniire",                                                                                    es: "Ver torneos" },
    preheader:  { en: "An update on {teamName}'s application for {tournamentName}.",                               ru: "Обновление по заявке команды {teamName} на {tournamentName}.",                                    et: "{teamName} avalduse uuendus turniirile {tournamentName}.",                                          es: "Actualización sobre la solicitud de {teamName} para {tournamentName}." },
  },
  // ─── Batched confirmations (multiple teams in one email) ─
  regConfirmedBatch: {
    subject:    { en: "Confirmed — {count} teams in {tournamentName}",                              ru: "Подтверждено — {count} команд в турнире {tournamentName}",                                  et: "Kinnitatud — {count} meeskonda turniiril {tournamentName}",                                    es: "Confirmado — {count} equipos en {tournamentName}" },
    bannerTitle:{ en: "{count} teams confirmed!",                                                     ru: "{count} команд подтверждены!",                                                              et: "{count} meeskonda kinnitatud!",                                                                  es: "¡{count} equipos confirmados!" },
    bannerSub:  { en: "Your teams have spots in {tournamentName}",                                    ru: "Ваши команды получили места в {tournamentName}",                                            et: "Teie meeskonnad on {tournamentName} osalejad",                                                    es: "Tus equipos tienen un lugar en {tournamentName}" },
    body1:      { en: "Hi <strong>{clubName}</strong>,",                                              ru: "Здравствуйте, <strong>{clubName}</strong>!",                                                et: "Tere <strong>{clubName}</strong>!",                                                              es: "Hola <strong>{clubName}</strong>," },
    body2:      { en: "The organizer has officially confirmed <strong>{count} of your teams</strong> for <strong>{tournamentName}</strong>:", ru: "Организатор официально подтвердил <strong>{count} ваших команд</strong> в <strong>{tournamentName}</strong>:", et: "Korraldaja on ametlikult kinnitanud <strong>{count} teie meeskonda</strong> turniirile <strong>{tournamentName}</strong>:", es: "El organizador ha confirmado oficialmente <strong>{count} de tus equipos</strong> para <strong>{tournamentName}</strong>:" },
    cta:        { en: "Open Team Portal →",                                                           ru: "Открыть кабинет команд →",                                                                  et: "Ava meeskondade kabinet →",                                                                       es: "Abrir panel de equipos →" },
    preheader:  { en: "{count} teams confirmed for {tournamentName}.",                                ru: "{count} команд подтверждены в {tournamentName}.",                                           et: "{count} meeskonda kinnitatud turniirile {tournamentName}.",                                       es: "{count} equipos confirmados en {tournamentName}." },
    footer:     { en: "Open your team portal to access all tournament details, schedule, and communicate with the organizer.", ru: "Откройте кабинет команд — детали турнира, расписание и связь с организатором.", et: "Ava meeskondade kabinet, et näha turniiri detaile, ajakava ja suhelda korraldajaga.", es: "Abre el panel de equipos para ver detalles del torneo, calendario y comunicarte con el organizador." },
  },

  regRejectedBatch: {
    subject:    { en: "Update — {count} applications for {tournamentName}",                          ru: "Решение по {count} заявкам — {tournamentName}",                                            et: "Otsus — {count} avaldust turniiril {tournamentName}",                                            es: "Decisión — {count} solicitudes en {tournamentName}" },
    title:      { en: "Application update",                                                          ru: "Решение по заявкам",                                                                       et: "Avalduste otsus",                                                                                es: "Actualización de solicitudes" },
    body:       { en: "Hi <strong>{clubName}</strong>, <strong>{count} of your teams</strong> were not accepted for <strong>{tournamentName}</strong> at this time. The organizer may have reached capacity or had other requirements.", ru: "Здравствуйте, <strong>{clubName}</strong>! <strong>{count} ваших команд</strong> не приняты в <strong>{tournamentName}</strong>. Возможно, организатор уже набрал лимит или были другие требования.", et: "Tere <strong>{clubName}</strong>! <strong>{count} teie meeskonda</strong> ei võetud sel korral turniirile <strong>{tournamentName}</strong>. Korraldaja võis täituda või seada muid nõudeid.", es: "Hola <strong>{clubName}</strong>, <strong>{count} de tus equipos</strong> no fueron aceptados en <strong>{tournamentName}</strong> esta vez. Puede que el organizador alcanzara el cupo o tuviera otros requisitos." },
    body2:      { en: "Browse the catalog to find another tournament that fits your teams.",         ru: "Загляните в каталог — там много открытых турниров.",                                       et: "Sirvige kataloogi, et leida sobiv turniir.",                                                     es: "Explora el catálogo para encontrar otro torneo." },
    cta:        { en: "Browse Tournaments",                                                          ru: "Каталог турниров",                                                                          et: "Sirvi turniire",                                                                                 es: "Ver torneos" },
    preheader:  { en: "{count} applications for {tournamentName} not accepted.",                     ru: "{count} заявок на {tournamentName} не приняты.",                                            et: "{count} avaldust turniirile {tournamentName} ei võetud vastu.",                                  es: "{count} solicitudes para {tournamentName} no aceptadas." },
  },

  // ─── In-app inbox: welcome message after a team registers ──
  registrationWelcome: {
    subject: { en: "Welcome! Your registration is confirmed", ru: "Добро пожаловать! Ваша заявка подтверждена", et: "Tere tulemast! Teie registreerimine on kinnitatud", es: "¡Bienvenido! Tu inscripción está confirmada" },
    body: {
      en: "Dear {clubName},\n\nYour teams have been successfully registered!\n\nPlease complete your registration by filling in:\n✅ Players — add all players\n✅ Staff — add coaching staff\n✅ Travel — arrival and departure details\n\nIf you have any questions, use the Inbox to contact the organizer.\n\nGoality TMC",
      ru: "Уважаемый клуб {clubName},\n\nВаши команды успешно зарегистрированы!\n\nПожалуйста, завершите регистрацию, заполнив:\n✅ Игроки — добавьте всех игроков\n✅ Персонал — добавьте тренерский штаб\n✅ Поездка — детали прибытия и отъезда\n\nЕсли есть вопросы — свяжитесь с организатором через Входящие.\n\nGoality TMC",
      et: "Lugupeetud {clubName},\n\nTeie meeskonnad on edukalt registreeritud!\n\nPalun lõpetage registreerimine, täites:\n✅ Mängijad — lisage kõik mängijad\n✅ Personal — lisage treenerid\n✅ Reis — saabumise ja lahkumise andmed\n\nKüsimuste korral võtke korraldajaga ühendust Postkasti kaudu.\n\nGoality TMC",
      es: "Estimado {clubName},\n\n¡Tus equipos se han registrado correctamente!\n\nCompleta tu inscripción rellenando:\n✅ Jugadores — añade todos los jugadores\n✅ Personal — añade el cuerpo técnico\n✅ Viaje — datos de llegada y salida\n\nSi tienes preguntas, usa la Bandeja de entrada para contactar al organizador.\n\nGoality TMC",
    },
  },

  // ─── Tournament News published (Follow feature, V1) ─────────
  newsPublished: {
    subject:        { en: "{tournamentName}: {newsSubject}",                                       ru: "{tournamentName}: {newsSubject}",                                          et: "{tournamentName}: {newsSubject}",                                            es: "{tournamentName}: {newsSubject}" },
    preheader:      { en: "New update from {tournamentName}",                                       ru: "Новое сообщение от {tournamentName}",                                       et: "Uus uudis turniirilt {tournamentName}",                                       es: "Nueva actualización de {tournamentName}" },
    intro:          { en: "Hi <strong>{clubName}</strong>, the organizer of <strong>{tournamentName}</strong> just shared news with followers.", ru: "Здравствуйте, <strong>{clubName}</strong>! Организатор турнира <strong>{tournamentName}</strong> опубликовал новость для подписчиков.", et: "Tere <strong>{clubName}</strong>! Turniiri <strong>{tournamentName}</strong> korraldaja postitas just uudise jälgijatele.", es: "Hola <strong>{clubName}</strong>, el organizador de <strong>{tournamentName}</strong> acaba de publicar una novedad para los seguidores." },
    openPost:       { en: "Read full post →",                                                       ru: "Читать полностью →",                                                        et: "Loe täispostitust →",                                                         es: "Leer publicación completa →" },
    unsubscribeLabel:{ en: "Unsubscribe from {tournamentName}",                                      ru: "Отписаться от {tournamentName}",                                            et: "Loobu jälgimisest: {tournamentName}",                                          es: "Cancelar suscripción a {tournamentName}" },
    unsubscribeHint:{ en: "You're receiving this because you follow {tournamentName}. One-click unsubscribe stops emails from this tournament only.", ru: "Вы получили это письмо, потому что подписаны на {tournamentName}. Один клик — и письма от этого турнира перестанут приходить.", et: "Saate selle kirja, sest jälgite turniiri {tournamentName}. Üks klõps — ja kirjad sellelt turniirilt enam ei tule.", es: "Recibes este correo porque sigues {tournamentName}. Un clic basta para dejar de recibir correos de este torneo." },
    signature:      { en: "Goality — Tournament Updates",                                            ru: "Goality — обновления турниров",                                             et: "Goality — turniiri uudised",                                                   es: "Goality — actualizaciones de torneos" },
    coverAlt:       { en: "Tournament news cover",                                                   ru: "Обложка новости турнира",                                                   et: "Turniiri uudise kaanepilt",                                                    es: "Portada de la noticia del torneo" },
  },

  // ─── Public confirmation page for one-click news unsubscribe ─
  unsubscribeNews: {
    confirmTitle:   { en: "You're unsubscribed",                                                    ru: "Вы отписаны",                                                              et: "Olete loobunud",                                                              es: "Te has dado de baja" },
    confirmBody:    { en: "We won't email you about <strong>{tournamentName}</strong> anymore. You can refollow anytime from the tournament page on Goality.", ru: "Мы больше не будем присылать вам письма про <strong>{tournamentName}</strong>. Вы можете подписаться снова в любой момент на странице турнира в Goality.", et: "Me ei saada teile enam kirju turniiri <strong>{tournamentName}</strong> kohta. Saate igal ajal uuesti jälgima hakata turniiri lehel Goalitys.", es: "Ya no te enviaremos correos sobre <strong>{tournamentName}</strong>. Puedes volver a suscribirte cuando quieras desde la página del torneo en Goality." },
    backToTournament:{ en: "Back to tournament",                                                    ru: "Вернуться к турниру",                                                       et: "Tagasi turniiri juurde",                                                       es: "Volver al torneo" },
    alreadyUnsubscribed:{ en: "This unsubscribe link is no longer active.",                          ru: "Эта ссылка больше не активна.",                                             et: "See lingiviide ei kehti enam.",                                                es: "Este enlace de cancelación ya no está activo." },
  },

  // ─── API error: duplicate tournament registration ──
  registrationDuplicate: {
    aliasUsed: {
      en: "Team \"{teamName}\" has already applied with the alias \"{alias}\". Use a different alias or cancel the existing application.",
      ru: "Команда «{teamName}» уже подавала заявку с псевдонимом «{alias}». Используйте другой псевдоним или отмените существующую заявку.",
      et: "Meeskond «{teamName}» on juba esitanud avalduse aliasega «{alias}». Kasutage teist aliast või tühistage olemasolev avaldus.",
      es: "El equipo «{teamName}» ya ha solicitado con el alias «{alias}». Usa otro alias o cancela la solicitud existente.",
    },
    alreadyRegistered: {
      en: "Team \"{teamName}\" is already registered for this tournament. To add a second squad, set an alias (Black/White/A/B), or cancel the existing application.",
      ru: "Команда «{teamName}» уже зарегистрирована в этом турнире. Чтобы добавить второй состав — задайте псевдоним (Black/White/A/B), либо отмените существующую заявку.",
      et: "Meeskond «{teamName}» on juba sellele turniirile registreeritud. Teise koosseisu lisamiseks määrake alias (Black/White/A/B) või tühistage olemasolev avaldus.",
      es: "El equipo «{teamName}» ya está inscrito en este torneo. Para añadir un segundo equipo, define un alias (Black/White/A/B) o cancela la solicitud existente.",
    },
  },
} as const;

// ─── Renderer ────────────────────────────────────────────────
export function t(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  group: any,
  key: string,
  locale: EmailLocale,
  vars?: Record<string, string | number | undefined | null>,
): string {
  const dict = group?.[key] as Dict | undefined;
  if (!dict) return key;
  const raw = dict[locale] ?? dict.en ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name) => {
    const v = vars[name];
    return v === undefined || v === null ? "" : String(v);
  });
}
