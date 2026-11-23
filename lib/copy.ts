const errors: Record<string, string> = {
  "Administrator sign-in required.": "Ұйымдастырушы ретінде кіріңіз.",
  "Invalid email or password.": "Email мекенжайы немесе құпиясөз қате.",
  "Voting is not open.": "Дауыс беру қазір ашық емес.",
  "Registration is closed.": "Тіркелу жабық.",
  "This guest code is invalid, revoked, or already used.":
    "Бұл код жарамсыз, қайтарылған немесе бұрын қолданылған.",
  "This couple is not eligible.": "Бұл жұп дауыс беруге қатыспайды.",
  "Enter the 20-character code on your ticket.":
    "Билеттегі 20 таңбалы кодты енгізіңіз.",
  "Too many attempts. Please try again later.":
    "Тым көп әрекет жасалды. Біраз уақыттан кейін қайта көріңіз.",
  "Close voting before publishing results.":
    "Нәтижені жариялау үшін алдымен дауыс беруді жабыңыз.",
  "The winner announcement is final.":
    "Жеңімпаз жарияланғаннан кейін дауыс беруді қайта ашу мүмкін емес.",
  "There are no validated votes.": "Әзірге расталған дауыс жоқ.",
  "No validated votes.": "Әзірге расталған дауыс жоқ.",
  "Ticket was redeemed, revoked, or not found.":
    "Билет қолданылған, қайтарылған немесе табылмады.",
  "A couple with votes cannot be deleted.":
    "Дауыс жиналған жұпты жою мүмкін емес.",
  "A couple with validated votes cannot be rejected.":
    "Дауыс жиналған жұптың өтінімін қабылдамау мүмкін емес.",
  "Upload the participant-approved photograph first.":
    "Алдымен қатысушылар рұқсат берген фотосуретті жүктеңіз.",
  "Request origin is not allowed.":
    "Бұл мекенжайдан сұрау жіберуге рұқсат жоқ. Сайттың негізгі сілтемесін пайдаланыңыз.",
  "Results have not been published.": "Нәтижелер әлі жарияланған жоқ.",
  "Select a photograph under 5 MB.":
    "Көлемі 5 МБ-тан аспайтын фотосуретті таңдаңыз.",
  "Use a JPG, PNG or WebP photograph.":
    "JPG, PNG немесе WebP фотосуретін таңдаңыз.",
  "The photograph could not be decoded. Choose a valid image.":
    "Фотосурет ашылмады. Басқа суретті таңдаңыз.",
  "The server could not complete this operation. Please try again.":
    "Сервер сұрауды орындай алмады. Қайта көріңіз.",
};
export function kkError(message: unknown) {
  if (typeof message !== "string") return "Сұрау орындалмады. Қайта көріңіз.";
  if (/[әғқңөұүіӘҒҚҢӨҰҮІ]/.test(message)) return message;
  return (
    errors[message] || "Сұрау орындалмады. Деректерді тексеріп, қайта көріңіз."
  );
}
