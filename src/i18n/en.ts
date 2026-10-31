// English UI texts
const en = {
  common: {
    loading: "Loading...",
    cards_one: "{{count}} card",
    cards_other: "{{count}} cards",
    students_one: "{{count}} student",
    students_other: "{{count}} students",
    words_one: "{{count}} word",
    words_other: "{{count}} words",
  },

  meta: {
    defaultTitle: "Flashio — learn English with AI",
  },

  nav: {
    home: "Home",
    sets: "My sets",
    classes: "Classes",
    login: "Log in",
    register: "Sign up",
    logout: "Log out",
    teacher: "teacher",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    language: "Language",
  },

  home: {
    heroTitle: "Learn English with",
    heroText:
      "Create flashcard sets by hand or in seconds with AI, practise words in handy study modes and learn together with your class.",
    start: "Get started for free",
    haveAccount: "I already have an account",
    features: {
      ai: {
        title: "AI-made sets",
        text: "Describe a topic and AI will pick words with translations in seconds.",
      },
      study: {
        title: "Flashcards & quizzes",
        text: "Flip cards, take quizzes and review the words you haven't learned yet.",
      },
      speech: {
        title: "Pronunciation",
        text: "Listen to the correct pronunciation of every English word.",
      },
      classes: {
        title: "Classes",
        text: "Teachers create classes, share sets with students and decide whether they can edit them.",
      },
    },
    howTitle: "How it works",
    steps: {
      account: {
        title: "Create an account",
        text: "Choose your role: student or teacher.",
      },
      set: { title: "Create a set", text: "By hand or with AI." },
      learn: { title: "Learn words", text: "With Flashcards and Quiz modes." },
    },
    greeting: "Hi, {{name}}! 👋",
    friend: "friend",
    subtitle: "What are we learning today?",
    quickAi: {
      title: "Set with AI",
      text: "Describe a topic and get words instantly",
    },
    quickManual: {
      title: "Set by hand",
      text: "Add your own words and translations",
    },
    quickClasses: {
      title: "My classes",
      teacher: "Create classes and share sets with students",
      student: "Join a class with a code",
    },
    recentSets: "Recent sets",
    allSets: "All sets →",
    emptyTitle: "Your sets will appear here",
    emptyText: "Start with your first one — AI is the fastest way.",
  },

  auth: {
    loginTitle: "Log in",
    registerTitle: "Sign up",
    username: "Username",
    email: "Email",
    password: "Password",
    roleLegend: "I'm signing up as a",
    student: "Student",
    teacher: "Teacher",
    loginButton: "Log in",
    loggingIn: "Logging in...",
    registerButton: "Sign up",
    registering: "Creating account...",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    errors: {
      invalid: "Wrong email or password",
      notConfirmed: "Your email isn't confirmed yet. Check your inbox.",
      shortPassword: "The password must be at least 6 characters long",
      confirmEmail:
        "Account created. Confirm your email using the link we sent, then log in.",
    },
  },

  sets: {
    title: "My sets",
    newSet: "+ New set",
    loadError: "Couldn't load your sets",
    emptyTitle: "You don't have any sets yet",
    emptyText: "Create your first set and start learning words.",
    backToSets: "← My sets",
    backToClasses: "← My classes",
    back: "← Back",
    notFoundTitle: "Set not found",
    notFoundText: "It may have been deleted, or you don't have access to it.",
  },

  setForm: {
    name: "Title",
    namePlaceholder: "For example: Travel, Unit 5",
    description: "Description (optional)",
    descriptionPlaceholder: "What is this set about",
    cards: "Cards",
  },

  editor: {
    termPlaceholder: "Word (English)",
    definitionPlaceholder: "Translation (Ukrainian)",
    addCard: "+ Add card",
    removeCard: "Remove card",
  },

  validation: {
    noTitle: "Enter a title for the set",
    bothSides: "Every card needs both sides filled in",
    minCards: "Add at least 2 cards",
  },

  create: {
    title: "New set",
    aiTitle: "New set with AI ✨",
    how: "How would you like to create the set?",
    manual: { title: "By hand", text: "Add words and translations yourself" },
    ai: {
      title: "With AI",
      text: "Describe a topic and AI will pick words with translations",
    },
    aiIntro:
      "Describe a topic and AI will create a draft: an English word on one side and its Ukrainian translation on the other. You can review and fix everything before saving.",
    aiDraft:
      "✨ AI has prepared a draft: {{words}}. Check the translations, fix or remove anything you don't need, then save the set.",
    regenerate: "Generate again",
    submit: "Create set",
    saving: "Saving...",
    createFailed: "Couldn't create the set",
    cardsFailed: "The set was created, but the cards couldn't be saved",
  },

  aiForm: {
    question: "What words do you need?",
    placeholder: "For example: words for travelling by plane",
    examples: {
      travel: "Travel and airports",
      emotions: "Emotions and feelings",
      phrasal: "Phrasal verbs with get",
      interview: "Job interview vocabulary",
    },
    level: "Level",
    count: "Number of words",
    empty: "Describe what words you need",
    generate: "✨ Generate",
    generating: "✨ Generating...",
    wait: "This usually takes a few seconds.",
    unknownError: "Something went wrong",
  },

  setPage: {
    edit: "Edit",
    delete: "Delete",
    confirmDelete: "Delete the set “{{title}}”? This can't be undone.",
    deleteFailed: "Couldn't delete the set",
    flashcards: { title: "Flashcards", text: "Flip and memorise" },
    quiz: { title: "Quiz", text: "Choose the correct translation" },
    words: "Words in this set",
  },

  edit: {
    title: "Edit set",
    pageTitle: "Editing: {{title}}",
    studentNotice:
      "Your teacher has allowed editing the cards in this set. Only the author can change the title and description.",
    cancel: "Cancel",
    save: "Save changes",
    saving: "Saving...",
    saveFailed: "Couldn't save the changes",
  },

  notFound: {
    title: "Page not found",
    back: "Back to home",
  },
};

export default en;
