import { SITE_CONTACT_EMAIL } from '../constants/siteContact'

export const translations = {
  ru: {
    nav: {
      logo: 'AutoBizLab',
      tagline: 'AI-автоматизация',
      audit: 'Получить аудит',
      phone: '+971 50 164 80 30',
    },
    hero: {
      badge: 'ОАЭ • MENA',
      h1: 'AI-агенты, которые работают за вас 24/7',
      sub: 'Автоматизируем до 70% бизнес-задач за 7–14 дней. Без сложной разработки и долгих внедрений.',
      checks: [
        'Мгновенная обработка заявок',
        'AI-ассистенты для общения с клиентами',
        'Интеграции с CRM и мессенджерами',
        'ROI от 3× уже в первый месяц',
      ],
      formTitle: 'Бесплатный аудит бизнеса',
      formSub: '30 минут · конкретный план · без обязательств',
      namePlaceholder: 'Ваше имя',
      phonePlaceholder: 'Телефон / WhatsApp',
      submit: 'Получить аудит →',
      submitLoading: 'Отправляем...',
      successTitle: 'Заявка принята!',
      successText: 'Мы ответим в течение 2 часов.',
      privacyConsent: 'Даю согласие на обработку персональных данных',
      privacyRequired: 'Отметьте согласие на обработку персональных данных',
    },
    pain: {
      title: 'Вы теряете деньги из-за ручных процессов',
      sub: 'Каждый день без автоматизации — это потерянные клиенты и деньги',
      items: [
        { icon: '⏱', title: 'Долгая обработка заявок', desc: 'Клиент ждёт часами. В ОАЭ скорость = деньги.' },
        { icon: '📱', title: 'Менеджеры не успевают', desc: 'Каждый пропущенный ответ — потеря клиента.' },
        { icon: '💸', title: 'Уходят к конкурентам', desc: 'Кто отвечает быстрее — тот зарабатывает больше.' },
        { icon: '🔁', title: 'Рутина съедает команду', desc: 'Сотрудники делают то, что AI может за секунды.' },
      ],
    },
    solutions: {
      title: 'Мы внедряем AI, который работает вместо вас',
      sub: 'Без сложной разработки и долгих внедрений',
      items: [
        { icon: '🤖', title: 'AI-чат-боты', desc: 'Принимают и обрабатывают заявки круглосуточно без участия менеджера' },
        { icon: '🧠', title: 'AI-ассистенты', desc: 'Ведут диалог, задают вопросы, квалифицируют и записывают клиентов' },
        { icon: '⚙️', title: 'Автоматизация процессов', desc: 'Убираем узкие места, ускоряем операции, снижаем ошибки' },
        { icon: '🔗', title: 'Интеграции CRM', desc: 'Подключаем к вашим системам: CRM, мессенджеры, почта, календари' },
      ],
    },
    results: {
      title: 'Что вы получаете',
      items: [
        { num: '70%', label: 'сокращение ручной работы' },
        { num: '3×', label: 'быстрее обработка заявок' },
        { num: '24/7', label: 'стабильная работа без перерывов' },
        { num: '14', label: 'дней до первого результата' },
      ],
    },
    steps: {
      title: 'Как это работает',
      items: [
        { n: '01', title: 'Бесплатный аудит', desc: 'Анализируем ваши процессы за 30 минут. Ни одного лишнего вопроса.' },
        { n: '02', title: 'Точки автоматизации', desc: 'Находим быстрые победы — где AI даст результат уже на старте.' },
        { n: '03', title: 'Внедряем AI-решение', desc: 'Запускаем систему за 7–14 дней. Без сложной разработки.' },
        { n: '04', title: 'Масштабируем результат', desc: 'Оптимизируем, расширяем, считаем ROI и двигаемся дальше.' },
      ],
    },
    scenario: {
      title: 'Как это работает на практике',
      steps: [
        'Клиент оставляет заявку',
        'AI-бот мгновенно отвечает',
        'Задаёт вопросы и квалифицирует',
        'Записывает на встречу',
        'Передаёт менеджеру «горячего» клиента',
      ],
      note: 'Ни одной потерянной заявки',
    },
    who: {
      title: 'Кому это подходит',
      tags: [
        'Малый и средний бизнес', 'Недвижимость', 'E-commerce',
        'Образование', 'Услуги', 'Высокий поток заявок',
        'Масштабирование', 'ОАЭ • MENA',
      ],
    },
    cta: {
      title: 'Получите план внедрения AI для вашего бизнеса',
      sub: 'На бесплатном аудите — конкретный план и расчёт потенциальной экономии',
      btn: 'Записаться на аудит',
    },
    faq: {
      title: 'Часто задаваемые вопросы',
      items: [
        { q: 'Это сложно внедрить?', a: 'Нет. Мы берём на себя всю техническую часть. Вам не нужно менять процессы — мы интегрируемся в существующие.' },
        { q: 'Сколько времени занимает запуск?', a: 'От 7 до 14 дней от аудита до запуска первого AI-решения в работу.' },
        { q: 'Нужно ли менять сотрудников?', a: 'Нет. AI дополняет команду, берёт рутину и освобождает время для важных задач.' },
        { q: 'Сколько это стоит?', a: 'Цена зависит от объёма задач. Обсудим на бесплатном аудите — никаких обязательств.' },
      ],
    },
    footer: {
      copy: '© 2024 AutoBizLab. Все права защищены.',
      phone: '+971 50 164 80 30',
      email: SITE_CONTACT_EMAIL,
      address: 'Business Centre, SPC Free Zone, Sharjah, UAE',
      privacy: 'Политика конфиденциальности',
    },
    seo: {
      landingTitle: 'AutoBizLab — AI-автоматизация для бизнеса в ОАЭ и MENA',
      landingDescription:
        'AI-агенты и автоматизация процессов за 7–14 дней. Заявки, CRM, мессенджеры — без долгой кастомной разработки.',
      ogImage: '/favicon.svg',
    },
    privacyPage: {
      docTitle: 'Политика конфиденциальности — AutoBizLab',
      metaDescription:
        'Как AutoBizLab обрабатывает персональные данные: цели, сроки хранения, контакты. Business Centre, SPC Free Zone, Sharjah, UAE.',
      title: 'Политика конфиденциальности',
      updated: 'Последнее обновление: 9 мая 2026 г.',
      intro:
        'Настоящая политика описывает порядок обработки персональных данных при использовании сайта autobizlab.store и связанных сервисов AutoBizLab. Используя сайт и отправляя заявки, вы подтверждаете, что ознакомились с этим документом.',
      sections: [
        {
          h: 'Кто мы',
          p: [
            `Оператор данных — AutoBizLab (далее — «мы»). Связь: ${SITE_CONTACT_EMAIL}, тел. +971 50 164 80 30. Юридический и почтовый адрес: Business Centre, SPC Free Zone, Sharjah, United Arab Emirates.`,
          ],
        },
        {
          h: 'Какие данные мы обрабатываем',
          p: [
            'Имя, контактный телефон, адрес электронной почты (если указаны), сведения о бизнесе и задаче — в объёме, который вы добровольно указываете в формах на сайте.',
            'Технические данные: IP-адрес, user agent, язык интерфейса, UTM-метки (если есть), время на странице, разрешение экрана и часовой пояс — для защиты от злоупотреблений и улучшения сервиса.',
          ],
        },
        {
          h: 'Цели и правовые основания',
          p: [
            'Обработка заявок и обратная связь — исполнение предварительных мер по запросу субъекта данных и заключению договора; ваше согласие при отметке соответствующего поля в форме.',
            'Аналитика и безопасность — законный интерес оператора (при условии баланса с вашими правами) либо согласие, если оно запрошено отдельно.',
          ],
        },
        {
          h: 'Хранение и передача',
          p: [
            'Данные хранятся на серверах, контролируемых нами, в объёме и сроки, необходимые для целей обработки, если закон не требует иного.',
            'Мы не продаём персональные данные. Передача третьим лицам возможна только при наличии законного основания (например, провайдеры хостинга/инфраструктуры по договору или требование уполномоченного органа).',
          ],
        },
        {
          h: 'Файлы cookie',
          p: [
            'Сайт может использовать технически необходимые cookies и аналоги для работы сессий и безопасности. Настройки браузера позволяют ограничить их использование.',
          ],
        },
        {
          h: 'Ваши права',
          p: [
            `Вы можете запросить доступ, исправление, удаление или ограничение обработки ваших данных — напишите на ${SITE_CONTACT_EMAIL}. Мы ответим в разумный срок согласно применимому праву.`,
          ],
        },
        {
          h: 'Изменения',
          p: [
            'Мы можем обновлять эту политику; актуальная версия всегда доступна по адресу /ru/privacy. Существенные изменения по возможности отражаем датой вверху страницы.',
          ],
        },
      ],
      backLink: '← На главную',
    },
  },

  en: {
    nav: {
      logo: 'AutoBizLab',
      tagline: 'AI Automation',
      audit: 'Get Free Audit',
      phone: '+971 50 164 80 30',
    },
    hero: {
      badge: 'UAE • MENA',
      h1: 'AI Agents that work for you 24/7',
      sub: 'Automate up to 70% of your business tasks in 7–14 days. No complex development.',
      checks: [
        'Instant lead processing',
        'AI assistants for client communication',
        'CRM & messenger integrations',
        '3× ROI in the first month',
      ],
      formTitle: 'Free Business Audit',
      formSub: '30 min · concrete plan · no obligations',
      namePlaceholder: 'Your name',
      phonePlaceholder: 'Phone / WhatsApp',
      submit: 'Get Audit →',
      submitLoading: 'Sending...',
      successTitle: 'Request received!',
      successText: 'We will respond within 2 hours.',
      privacyConsent: 'I consent to the processing of my personal data',
      privacyRequired: 'Please confirm your consent to data processing',
    },
    pain: {
      title: "You're losing money on manual processes",
      sub: 'Every day without automation means lost clients and revenue',
      items: [
        { icon: '⏱', title: 'Slow lead processing', desc: 'Clients wait hours. In UAE, speed = money.' },
        { icon: '📱', title: "Managers can't keep up", desc: 'Every missed reply is a lost client.' },
        { icon: '💸', title: 'Clients go to competitors', desc: 'Faster response = more revenue, period.' },
        { icon: '🔁', title: 'Routine burns your team', desc: 'Staff doing what AI can do in seconds.' },
      ],
    },
    solutions: {
      title: 'We implement AI that works instead of you',
      sub: 'No complex development, no long rollouts',
      items: [
        { icon: '🤖', title: 'AI Chatbots', desc: 'Accept and process leads 24/7 without manager involvement' },
        { icon: '🧠', title: 'AI Assistants', desc: 'Engage, qualify and book clients automatically' },
        { icon: '⚙️', title: 'Process Automation', desc: 'Eliminate bottlenecks, accelerate operations, reduce errors' },
        { icon: '🔗', title: 'CRM Integrations', desc: 'Connect to your systems: CRM, messengers, email, calendars' },
      ],
    },
    results: {
      title: 'What you get',
      items: [
        { num: '70%', label: 'reduction in manual work' },
        { num: '3×', label: 'faster lead processing' },
        { num: '24/7', label: 'stable operation without breaks' },
        { num: '14', label: 'days to first result' },
      ],
    },
    steps: {
      title: 'How it works',
      items: [
        { n: '01', title: 'Free Audit', desc: 'We analyze your processes in 30 minutes. No unnecessary questions.' },
        { n: '02', title: 'Find Automation Points', desc: 'Identify quick wins — where AI delivers results from day one.' },
        { n: '03', title: 'Implement AI', desc: 'Launch the solution in 7–14 days. No complex development.' },
        { n: '04', title: 'Scale Up', desc: 'Optimize, expand, measure ROI and keep moving forward.' },
      ],
    },
    scenario: {
      title: 'How it works in practice',
      steps: [
        'Client submits a request',
        'AI bot responds instantly',
        'Asks questions and qualifies',
        'Books a meeting',
        'Passes a "hot" lead to the manager',
      ],
      note: 'Not a single lead lost',
    },
    who: {
      title: "Who it's for",
      tags: [
        'SME Business', 'Real Estate', 'E-commerce',
        'Education', 'Services', 'High-volume Leads',
        'Scaling', 'UAE • MENA',
      ],
    },
    cta: {
      title: 'Get an AI implementation plan for your business',
      sub: 'At the free audit — a concrete plan and potential savings calculation',
      btn: 'Book an Audit',
    },
    faq: {
      title: 'Frequently Asked Questions',
      items: [
        { q: 'Is it difficult to implement?', a: "No. We handle all the technical parts. You don't need to change processes — we integrate into existing ones." },
        { q: 'How long does it take?', a: 'From 7 to 14 days from audit to launch of the first AI solution.' },
        { q: 'Do we need to replace staff?', a: 'No. AI complements the team, handles routine, and frees time for important tasks.' },
        { q: 'How much does it cost?', a: "Price depends on the scope. We'll discuss at the free audit — no obligations." },
      ],
    },
    footer: {
      copy: '© 2024 AutoBizLab. All rights reserved.',
      phone: '+971 50 164 80 30',
      email: SITE_CONTACT_EMAIL,
      address: 'Business Centre, SPC Free Zone, Sharjah, UAE',
      privacy: 'Privacy policy',
    },
    seo: {
      landingTitle: 'AutoBizLab — AI automation for business in the UAE & MENA',
      landingDescription:
        'AI agents and process automation in 7–14 days. Leads, CRM, messengers — without lengthy custom development.',
      ogImage: '/favicon.svg',
    },
    privacyPage: {
      docTitle: 'Privacy Policy — AutoBizLab',
      metaDescription:
        'How AutoBizLab processes personal data: purposes, retention, contacts. Business Centre, SPC Free Zone, Sharjah, UAE.',
      title: 'Privacy Policy',
      updated: 'Last updated: 9 May 2026',
      intro:
        'This policy describes how we process personal data when you use autobizlab.store and related AutoBizLab services. By using the site and submitting forms, you confirm that you have read this document.',
      sections: [
        {
          h: 'Who we are',
          p: [
            `The data controller is AutoBizLab ("we"). Contact: ${SITE_CONTACT_EMAIL}, phone +971 50 164 80 30. Address: Business Centre, SPC Free Zone, Sharjah, United Arab Emirates.`,
          ],
        },
        {
          h: 'What data we process',
          p: [
            'Name, phone, email (if provided), business and project details — only what you voluntarily submit in our forms.',
            'Technical data: IP address, user agent, interface language, UTM tags (if any), time on page, screen resolution and time zone — for abuse prevention and service improvement.',
          ],
        },
        {
          h: 'Purposes and legal bases',
          p: [
            'Processing enquiries — steps at your request prior to a contract and your consent when you tick the consent box.',
            'Analytics and security — legitimate interests where balanced with your rights, or consent where requested separately.',
          ],
        },
        {
          h: 'Retention and sharing',
          p: [
            'Data is stored on servers under our control for as long as needed for the purposes above, unless law requires otherwise.',
            'We do not sell personal data. Sharing with processors (e.g. hosting) is under contract; disclosure to authorities occurs only when legally required.',
          ],
        },
        {
          h: 'Cookies',
          p: [
            'The site may use strictly necessary cookies and similar technologies for sessions and security. You can restrict cookies via your browser settings.',
          ],
        },
        {
          h: 'Your rights',
          p: [
            `You may request access, correction, erasure or restriction — email ${SITE_CONTACT_EMAIL}. We will respond within a reasonable time under applicable law.`,
          ],
        },
        {
          h: 'Changes',
          p: [
            'We may update this policy; the current version is always at /en/privacy. Material changes are reflected in the date at the top where possible.',
          ],
        },
      ],
      backLink: '← Back to home',
    },
  },
}

export const enquireTranslations = {
  ru: {
    title: 'Расскажите о вашем бизнесе',
    sub: 'Мы подготовим индивидуальный план автоматизации под ваши задачи',
    sections: {
      contact: 'Контактные данные',
      business: 'О вашем бизнесе',
      task: 'Ваша задача',
      comm: 'Способ связи',
    },
    fields: {
      first_name: 'Имя',
      last_name: 'Фамилия',
      phone: 'Телефон / WhatsApp *',
      email: 'Email',
      business_niche: 'Ниша бизнеса',
      company_size: 'Размер компании',
      task_volume: 'Объём задач / процессов',
      role: 'Ваша роль',
      business_info: 'Расскажите о бизнесе',
      task_type: 'Тип задачи',
      interested_product: 'Интересующий продукт',
      timeline: 'Когда нужен результат',
      budget: 'Бюджет',
      contact_preference: 'Удобный способ связи',
      preferred_time: 'Удобное время для связи',
      comments: 'Комментарии',
    },
    placeholders: {
      business_info: 'Что делаете, сколько сотрудников, основные сложности...',
      preferred_time: 'Например: будни с 10 до 18 по Dubai (UTC+4)',
      comments: 'Любая дополнительная информация...',
    },
    options: {
      company_size: ['1–10 человек', '11–50 человек', '51–200 человек', '200+ человек'],
      task_volume: [
        'Небольшой (1–2 процесса)',
        'Средний (3–10 процессов)',
        'Масштабный (10+ процессов)',
      ],
      role: ['Владелец / CEO', 'Руководитель отдела', 'Менеджер / Специалист', 'Другое'],
      timeline: ['Срочно (до 2 недель)', 'В течение месяца', '1–3 месяца', 'Пока изучаем варианты'],
      contact_preference: ['WhatsApp', 'Telegram', 'Email', 'Телефонный звонок', 'Любой удобный'],
    },
    submit: 'Отправить заявку →',
    submitLoading: 'Отправляем...',
    successTitle: 'Спасибо! Заявка отправлена.',
    successText: 'Мы ответим в течение 2 часов.',
    backHome: '← На главную',
    required: 'Пожалуйста, укажите телефон',
    privacyConsent: 'Даю согласие на обработку персональных данных',
    privacyRequired: 'Отметьте согласие на обработку персональных данных',
    seo: {
      docTitle: 'Заявка на аудит — AutoBizLab',
      metaDescription:
        'Расскажите о бизнесе — подготовим план AI-автоматизации. Ниша, задача, бюджет и контакты в одной форме.',
    },
  },
  en: {
    title: 'Tell us about your business',
    sub: "We'll prepare a personalized automation plan for your needs",
    sections: {
      contact: 'Contact Information',
      business: 'About Your Business',
      task: 'Your Task',
      comm: 'Communication',
    },
    fields: {
      first_name: 'First Name',
      last_name: 'Last Name',
      phone: 'Phone / WhatsApp *',
      email: 'Email',
      business_niche: 'Business Niche',
      company_size: 'Company Size',
      task_volume: 'Scope (processes)',
      role: 'Your Role',
      business_info: 'About Your Business',
      task_type: 'Task Type',
      interested_product: 'Product of Interest',
      timeline: 'When Do You Need Results',
      budget: 'Budget',
      contact_preference: 'Preferred Contact Method',
      preferred_time: 'Preferred Contact Time',
      comments: 'Comments',
    },
    placeholders: {
      business_info: 'What you do, number of employees, main challenges...',
      preferred_time: 'E.g.: weekdays 10am–6pm Dubai time (UTC+4)',
      comments: 'Any additional information...',
    },
    options: {
      company_size: ['1–10 people', '11–50 people', '51–200 people', '200+ people'],
      task_volume: [
        'Small (1–2 processes)',
        'Medium (3–10 processes)',
        'Large (10+ processes)',
      ],
      role: ['Owner / CEO', 'Department head', 'Manager / Specialist', 'Other'],
      timeline: [
        'Urgent (within 2 weeks)',
        'Within a month',
        '1–3 months',
        'Still exploring options',
      ],
      contact_preference: ['WhatsApp', 'Telegram', 'Email', 'Phone call', 'Whatever works best'],
    },
    submit: 'Submit Application →',
    submitLoading: 'Sending...',
    successTitle: 'Thank you! Your application has been submitted.',
    successText: 'We will respond within 2 hours.',
    backHome: '← Back to Home',
    required: 'Please provide your phone number',
    privacyConsent: 'I consent to the processing of my personal data',
    privacyRequired: 'Please confirm your consent to data processing',
    seo: {
      docTitle: 'Request a business audit — AutoBizLab',
      metaDescription:
        'Tell us about your business and get a tailored AI automation plan. Niche, task, budget and contact details in one form.',
    },
  },
}

export { adminTranslations } from './admin'
