// The specimen on the home page: a real item from content/items.json, with
// the app's own way of learning it (hide the transliteration, then the
// translation). Without JavaScript the first dua shows in full.

const DUAS = [
  {
    title: 'Leaving home',
    arabic:
      'بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    transliteration: 'Bismillāh, tawakkaltu ʿalā Allāh, wa lā ḥawla wa lā quwwata illā billāh',
    translation:
      'In the name of Allah, I place my trust in Allah, and there is no might nor power except with Allah.',
    source: ['Sunan Abi Dawud 5095.', 'Graded sahih by al-Albani.'],
  },
  {
    title: 'Setting off in a vehicle',
    arabic:
      'بِسْمِ اللَّهِ، الْحَمْدُ لِلَّهِ، سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ',
    transliteration:
      'Bismillāh, al-ḥamdu lillāh, subḥāna-lladhī sakhkhara lanā hādhā wa mā kunnā lahu muqrinīn, wa innā ilā Rabbinā lamunqalibūn',
    translation:
      'In the name of Allah, praise be to Allah. Glory to Him who has subjected this to us, and we could never have accomplished it by ourselves; and to our Lord we shall surely return.',
    source: ['Qur’an 43:13.', 'Sunan Abi Dawud 2602, graded sahih by al-Albani.'],
  },
  {
    title: 'Coming home',
    arabic: 'بِسْمِ اللَّهِ',
    transliteration: 'Bismillāh',
    translation: 'In the name of Allah.',
    source: ['Sahih Muslim 2018.', ''],
  },
]

function setup() {
  const specimen = document.querySelector('.specimen')
  if (!specimen) return

  const field = (name) => specimen.querySelector(`[data-field="${name}"]`)
  const title = specimen.querySelector('#specimen-title')
  const next = specimen.querySelector('[data-next]')
  const practice = specimen.querySelector('[data-practice]')
  let index = 0

  function show(dua) {
    title.textContent = dua.title
    field('arabic').textContent = dua.arabic
    field('transliteration').textContent = dua.transliteration
    field('translation').textContent = dua.translation
    const source = field('source')
    const strong = document.createElement('strong')
    strong.textContent = dua.source[0]
    source.replaceChildren(strong, dua.source[1] ? ` ${dua.source[1]}` : '')
  }

  next.hidden = false
  next.addEventListener('click', () => {
    index = (index + 1) % DUAS.length
    show(DUAS[index])
  })

  practice.hidden = false
  for (const button of practice.querySelectorAll('[data-hide]')) {
    const target = field(button.dataset.hide)
    button.addEventListener('click', () => {
      const hidden = button.getAttribute('aria-pressed') !== 'true'
      button.setAttribute('aria-pressed', String(hidden))
      target.classList.toggle('is-hidden', hidden)
      target.setAttribute('aria-hidden', String(hidden))
    })
  }
}

setup()
