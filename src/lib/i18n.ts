import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Supported languages
export type Language = 'en' | 'es' | 'th' | 'hi' | 'id';

export const languageOptions: { code: Language; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'th', label: 'Thai', nativeLabel: 'ไทย' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa' },
];

// Get saved language or default to English
const savedLanguage = localStorage.getItem('jc_language') || 'en';

export const resources = {
  en: {
    translation: {
      // Common
      app_name: 'Jackie Chain',
      subtitle: 'Millionaire',
      powered_by: 'Powered by World ID • Rewards on World Chain',
      banner_friends: "🤝 Let's be friends on",
      
      // Home
      home: {
        win_jackpot: 'Win 1M $JC!',
        description: 'Answer 15 questions to climb the prize ladder. Use lifelines wisely!',
        verify_to_play: 'Verify to Play',
        start_run: 'Start Run',
        next_play_in: 'Next play in',
        login_world_id: 'Login with World ID',
        login_solana: 'Login with Solana',
        plays_today: 'Plays Today',
        from_referrals: 'from referrals',
        invite_friend: 'Invite a friend = +1 extra play',
        share: 'Share',
        copied: 'Invite link copied!',
        questions: 'Questions',
        questions_desc: 'Answer 15 trivia questions of increasing difficulty. Each correct answer moves you up the prize ladder. Get them all right to win the jackpot!',
        lifelines: 'Lifelines',
        lifelines_desc: 'You have 3 lifelines per run: 50/50 removes two wrong answers, Hint gives you a clue, and Chain Scan shows what the community answered.',
        safe_havens: 'Safe Havens',
        safe_havens_desc: 'Questions 5 and 10 are safe havens. If you answer wrong after reaching a safe haven, you keep the prize from that level instead of losing everything!',
      },

      // Game
      game: {
        question_of: 'Question {{current}} of {{total}}',
        time_up: "Time's up!",
        correct: 'Correct!',
        wrong: 'Wrong!',
        jackie_says: 'Jackie says:',
        chain_scan_results: 'Chain Scan Results',
        players: 'players',
        share_to_save: 'Share to Save',
        share_to_save_desc: 'Share the game to keep your coins!',
        share_now: 'Share Now',
        skip_share: 'Skip',
        sharing: 'Sharing...',
        question_complete: 'Question {{number}} complete!',
        safe_haven: 'Safe Haven!',
        safe_haven_note: "This is a safe haven! If you lose later, you'll keep this amount.",
        claim_or_continue: 'Claim now to secure your prize, or keep going for more!',
        claim: 'Claim',
        keep_going: 'Keep Going',
        your_progress: 'Your Progress',
      },

      // Lifelines
      lifelines: {
        fifty_fifty: '50/50',
        hint: 'Hint',
        chain_scan: 'Chain Scan',
      },

      // Result
      result: {
        game_over: 'Game Over',
        congratulations: 'Congratulations!',
        you_won: 'You Won',
        you_earned: 'You Earned',
        claim_now: 'Claim Now',
        play_again: 'Play Again',
        go_home: 'Go Home',
        share_result: 'Share Result',
      },

      // Profile
      profile: {
        title: 'Profile',
        total_earned: 'Total Earned',
        current_streak: 'Current Streak',
        days: 'days',
        total_runs: 'Total Runs',
        best_streak: 'Best Streak',
        best_question: 'Best Question',
        referrals: 'Referrals',
        best_win: 'Best Win',
        longest_streak: 'Longest Streak',
        day_streak: '{{count}} day streak',
        verified_world_id: 'Verified with World ID',
        stats: 'Stats',
        history: 'History',
      },

      // Leaderboard
      leaderboard: {
        title: 'Leaderboard',
        rank: 'Rank',
        player: 'Player',
        earnings: 'Earnings',
        you: 'You',
        share_rank: 'Share my rank',
        yourRank: 'Your Rank',
        airdropIn: '$JS Snapshot in',
        airdropDescription: 'Climb to the top to increase your $JS stack!',
        days: 'days',
        hrs: 'hrs',
        min: 'min',
        sec: 'sec',
        invited: 'invited',
        games: 'games',
        shareMyRank: 'Share my rank',
        noClaims: 'No claims yet!',
        beFirst: 'Be the first to claim rewards.',
        players: 'Players',
        totalClaimed: 'Total Claimed',
      },

      // Verification
      verify: {
        title: 'Verify with World ID',
        description: 'Prove you are a unique human to start playing',
        verifying: 'Verifying...',
        verify_button: 'Verify with World ID',
        verified: 'Verified!',
        welcome: 'Welcome to Jackie Chain!',
      },

      // Notifications
      notifications: {
        title: 'Stay Updated!',
        description: 'Get notified about daily rewards, new games, and special events.',
        enable: 'Enable Notifications',
        skip: 'Skip for now',
        enabled: 'Notifications enabled!',
        denied: 'Notifications denied',
      },

      // Pool stats
      pool: {
        todays_pool: "Today's Pool",
        remaining: 'Remaining',
        locked: 'Locked',
      },

      // Navigation
      nav: {
        home: 'Home',
        game: 'Game',
        live: 'Live',
        leaderboard: 'Leaderboard',
        profile: 'Profile',
      },

      // Trailer
      trailer: {
        watch_trailer: 'Watch the Trailer!',
        story: 'Story',
        referral: 'Invite',
      },
    },
  },
  es: {
    translation: {
      // Common
      app_name: 'Jackie Chain',
      subtitle: 'Millonario',
      powered_by: 'Impulsado por World ID • Recompensas en World Chain',
      banner_friends: '🤝 Seamos amigos en',
      
      // Home
      home: {
        win_jackpot: '¡Gana 1M $JC!',
        description: 'Responde 15 preguntas para subir la escalera de premios. ¡Usa los comodines sabiamente!',
        verify_to_play: 'Verificar para Jugar',
        start_run: 'Comenzar Juego',
        next_play_in: 'Próximo juego en',
        login_world_id: 'Iniciar sesión con World ID',
        login_solana: 'Iniciar sesión con Solana',
        plays_today: 'Juegos Hoy',
        from_referrals: 'de referencias',
        invite_friend: 'Invita un amigo = +1 juego extra',
        share: 'Compartir',
        copied: '¡Enlace de invitación copiado!',
        questions: 'Preguntas',
        questions_desc: 'Responde 15 preguntas de trivia de dificultad creciente. Cada respuesta correcta te sube en la escalera de premios. ¡Aciértalas todas para ganar el premio mayor!',
        lifelines: 'Comodines',
        lifelines_desc: 'Tienes 3 comodines por juego: 50/50 elimina dos respuestas incorrectas, Pista te da una pista, y Escaneo de Cadena muestra lo que respondió la comunidad.',
        safe_havens: 'Refugios Seguros',
        safe_havens_desc: 'Las preguntas 5 y 10 son refugios seguros. Si te equivocas después de alcanzar un refugio seguro, ¡conservas el premio de ese nivel en lugar de perderlo todo!',
      },

      // Game
      game: {
        question_of: 'Pregunta {{current}} de {{total}}',
        time_up: '¡Se acabó el tiempo!',
        correct: '¡Correcto!',
        wrong: '¡Incorrecto!',
        jackie_says: 'Jackie dice:',
        chain_scan_results: 'Resultados del Escaneo',
        players: 'jugadores',
        share_to_save: 'Compartir para Guardar',
        share_to_save_desc: '¡Comparte el juego para conservar tus monedas!',
        share_now: 'Compartir Ahora',
        skip_share: 'Omitir',
        sharing: 'Compartiendo...',
        question_complete: '¡Pregunta {{number}} completada!',
        safe_haven: '¡Refugio Seguro!',
        safe_haven_note: '¡Este es un refugio seguro! Si pierdes después, conservarás esta cantidad.',
        claim_or_continue: '¡Reclama ahora para asegurar tu premio, o sigue adelante por más!',
        claim: 'Reclamar',
        keep_going: 'Seguir Adelante',
        your_progress: 'Tu Progreso',
      },

      // Lifelines
      lifelines: {
        fifty_fifty: '50/50',
        hint: 'Pista',
        chain_scan: 'Escaneo',
      },

      // Result
      result: {
        game_over: 'Fin del Juego',
        congratulations: '¡Felicitaciones!',
        you_won: 'Ganaste',
        you_earned: 'Has Ganado',
        claim_now: 'Reclamar Ahora',
        play_again: 'Jugar de Nuevo',
        go_home: 'Ir al Inicio',
        share_result: 'Compartir Resultado',
      },

      // Profile
      profile: {
        title: 'Perfil',
        total_earned: 'Total Ganado',
        current_streak: 'Racha Actual',
        days: 'días',
        total_runs: 'Total de Juegos',
        best_streak: 'Mejor Racha',
        best_question: 'Mejor Pregunta',
        referrals: 'Referencias',
        best_win: 'Mejor Victoria',
        longest_streak: 'Racha Más Larga',
        day_streak: 'Racha de {{count}} días',
        verified_world_id: 'Verificado con World ID',
        stats: 'Estadísticas',
        history: 'Historial',
      },

      // Leaderboard
      leaderboard: {
        title: 'Clasificación',
        rank: 'Posición',
        player: 'Jugador',
        earnings: 'Ganancias',
        you: 'Tú',
        share_rank: 'Compartir mi posición',
        yourRank: 'Tu Posición',
        airdropIn: 'Snapshot $JS en',
        airdropDescription: '¡Escala hasta la cima para aumentar tu stack de $JS!',
        days: 'días',
        hrs: 'hrs',
        min: 'min',
        sec: 'seg',
        invited: 'invitados',
        games: 'juegos',
        shareMyRank: 'Compartir mi posición',
        noClaims: '¡Aún no hay reclamos!',
        beFirst: 'Sé el primero en reclamar recompensas.',
        players: 'Jugadores',
        totalClaimed: 'Total Reclamado',
      },

      // Verification
      verify: {
        title: 'Verificar con World ID',
        description: 'Demuestra que eres un humano único para comenzar a jugar',
        verifying: 'Verificando...',
        verify_button: 'Verificar con World ID',
        verified: '¡Verificado!',
        welcome: '¡Bienvenido a Jackie Chain!',
      },

      // Notifications
      notifications: {
        title: '¡Mantente Actualizado!',
        description: 'Recibe notificaciones sobre recompensas diarias, nuevos juegos y eventos especiales.',
        enable: 'Activar Notificaciones',
        skip: 'Omitir por ahora',
        enabled: '¡Notificaciones activadas!',
        denied: 'Notificaciones denegadas',
      },

      // Pool stats
      pool: {
        todays_pool: 'Premio de Hoy',
        remaining: 'Restante',
        locked: 'Bloqueado',
      },

      // Navigation
      nav: {
        home: 'Inicio',
        game: 'Juego',
        live: 'En vivo',
        leaderboard: 'Ranking',
        profile: 'Perfil',
      },

      // Trailer
      trailer: {
        watch_trailer: '¡Mira el Trailer!',
        story: 'Historia',
        referral: 'Invitar',
      },
    },
  },
  th: {
    translation: {
      // Common
      app_name: 'Jackie Chain',
      subtitle: 'มหาเศรษฐี',
      powered_by: 'ขับเคลื่อนโดย World ID • รางวัลบน World Chain',
      banner_friends: '🤝 มาเป็นเพื่อนกันบน',
      
      // Home
      home: {
        win_jackpot: 'ชนะ 1M $JC!',
        description: 'ตอบคำถาม 15 ข้อเพื่อไต่บันไดรางวัล ใช้ตัวช่วยอย่างชาญฉลาด!',
        verify_to_play: 'ยืนยันเพื่อเล่น',
        start_run: 'เริ่มเกม',
        next_play_in: 'เล่นครั้งต่อไปใน',
        login_world_id: 'เข้าสู่ระบบด้วย World ID',
        login_solana: 'เข้าสู่ระบบด้วย Solana',
        plays_today: 'เล่นวันนี้',
        from_referrals: 'จากการเชิญ',
        invite_friend: 'ชวนเพื่อน = +1 รอบเล่น',
        share: 'แชร์',
        copied: 'คัดลอกลิงก์เชิญแล้ว!',
        questions: 'คำถาม',
        questions_desc: 'ตอบคำถามความรู้ทั่วไป 15 ข้อที่ยากขึ้นเรื่อยๆ คำตอบที่ถูกต้องจะพาคุณขึ้นบันไดรางวัล ตอบถูกทุกข้อเพื่อรับแจ็คพอต!',
        lifelines: 'ตัวช่วย',
        lifelines_desc: 'คุณมี 3 ตัวช่วยต่อรอบ: 50/50 ลบคำตอบผิด 2 ข้อ, คำใบ้ให้เบาะแส และ Chain Scan แสดงคำตอบของชุมชน',
        safe_havens: 'จุดปลอดภัย',
        safe_havens_desc: 'คำถามที่ 5 และ 10 เป็นจุดปลอดภัย ถ้าตอบผิดหลังจากถึงจุดปลอดภัย คุณจะเก็บรางวัลจากระดับนั้นแทนที่จะเสียทั้งหมด!',
      },

      // Game
      game: {
        question_of: 'คำถาม {{current}} จาก {{total}}',
        time_up: 'หมดเวลา!',
        correct: 'ถูกต้อง!',
        wrong: 'ผิด!',
        jackie_says: 'Jackie พูดว่า:',
        chain_scan_results: 'ผลลัพธ์ Chain Scan',
        players: 'ผู้เล่น',
        share_to_save: 'แชร์เพื่อเก็บ',
        share_to_save_desc: 'แชร์เกมเพื่อเก็บเหรียญของคุณ!',
        share_now: 'แชร์เลย',
        skip_share: 'ข้าม',
        sharing: 'กำลังแชร์...',
        question_complete: 'คำถามที่ {{number}} เสร็จสิ้น!',
        safe_haven: 'จุดปลอดภัย!',
        safe_haven_note: 'นี่คือจุดปลอดภัย! ถ้าแพ้ทีหลัง คุณจะเก็บจำนวนนี้ไว้ได้',
        claim_or_continue: 'รับเลยเพื่อรับรางวัล หรือเล่นต่อเพื่อรางวัลมากขึ้น!',
        claim: 'รับ',
        keep_going: 'เล่นต่อ',
        your_progress: 'ความคืบหน้าของคุณ',
      },

      // Lifelines
      lifelines: {
        fifty_fifty: '50/50',
        hint: 'คำใบ้',
        chain_scan: 'Chain Scan',
      },

      // Result
      result: {
        game_over: 'จบเกม',
        congratulations: 'ยินดีด้วย!',
        you_won: 'คุณชนะ',
        you_earned: 'คุณได้รับ',
        claim_now: 'รับเลย',
        play_again: 'เล่นอีกครั้ง',
        go_home: 'กลับหน้าหลัก',
        share_result: 'แชร์ผลลัพธ์',
      },

      // Profile
      profile: {
        title: 'โปรไฟล์',
        total_earned: 'รายได้รวม',
        current_streak: 'สตรีคปัจจุบัน',
        days: 'วัน',
        total_runs: 'รอบเล่นทั้งหมด',
        best_streak: 'สตรีคที่ดีที่สุด',
        best_question: 'คำถามที่ดีที่สุด',
        referrals: 'การเชิญ',
        best_win: 'ชนะสูงสุด',
        longest_streak: 'สตรีคยาวที่สุด',
        day_streak: 'สตรีค {{count}} วัน',
        verified_world_id: 'ยืนยันด้วย World ID',
        stats: 'สถิติ',
        history: 'ประวัติ',
      },

      // Leaderboard
      leaderboard: {
        title: 'กระดานผู้นำ',
        rank: 'อันดับ',
        player: 'ผู้เล่น',
        earnings: 'รายได้',
        you: 'คุณ',
        share_rank: 'แชร์อันดับ',
        yourRank: 'อันดับของคุณ',
        airdropIn: 'Snapshot $JS ใน',
        airdropDescription: 'ไต่ขึ้นสู่จุดสูงสุดเพื่อเพิ่มสต็อก $JS ของคุณ!',
        days: 'วัน',
        hrs: 'ชม.',
        min: 'นาที',
        sec: 'วิ',
        invited: 'เชิญแล้ว',
        games: 'เกม',
        shareMyRank: 'แชร์อันดับของฉัน',
        noClaims: 'ยังไม่มีการรับรางวัล!',
        beFirst: 'เป็นคนแรกที่รับรางวัล',
        players: 'ผู้เล่น',
        totalClaimed: 'รวมที่รับแล้ว',
      },

      // Verification
      verify: {
        title: 'ยืนยันด้วย World ID',
        description: 'พิสูจน์ว่าคุณเป็นมนุษย์ที่ไม่ซ้ำกันเพื่อเริ่มเล่น',
        verifying: 'กำลังยืนยัน...',
        verify_button: 'ยืนยันด้วย World ID',
        verified: 'ยืนยันแล้ว!',
        welcome: 'ยินดีต้อนรับสู่ Jackie Chain!',
      },

      // Notifications
      notifications: {
        title: 'รับข่าวสาร!',
        description: 'รับการแจ้งเตือนเกี่ยวกับรางวัลประจำวัน เกมใหม่ และกิจกรรมพิเศษ',
        enable: 'เปิดการแจ้งเตือน',
        skip: 'ข้ามไปก่อน',
        enabled: 'เปิดการแจ้งเตือนแล้ว!',
        denied: 'ปฏิเสธการแจ้งเตือน',
      },

      // Pool stats
      pool: {
        todays_pool: 'กองรางวัลวันนี้',
        remaining: 'เหลือ',
        locked: 'ล็อค',
      },

      // Navigation
      nav: {
        home: 'หน้าหลัก',
        game: 'เกม',
        live: 'ไลฟ์',
        leaderboard: 'ผู้นำ',
        profile: 'โปรไฟล์',
      },

      // Trailer
      trailer: {
        watch_trailer: 'ดูตัวอย่าง!',
        story: 'เรื่องราว',
        referral: 'เชิญ',
      },
    },
  },
  hi: {
    translation: {
      // Common
      app_name: 'Jackie Chain',
      subtitle: 'करोड़पति',
      powered_by: 'World ID द्वारा संचालित • World Chain पर पुरस्कार',
      banner_friends: '🤝 चलो दोस्त बनें',
      
      // Home
      home: {
        win_jackpot: '1M $JC जीतें!',
        description: 'पुरस्कार सीढ़ी चढ़ने के लिए 15 सवालों के जवाब दें। लाइफलाइन का समझदारी से उपयोग करें!',
        verify_to_play: 'खेलने के लिए सत्यापित करें',
        start_run: 'गेम शुरू करें',
        next_play_in: 'अगला खेल में',
        login_world_id: 'World ID से लॉगिन करें',
        login_solana: 'Solana से लॉगिन करें',
        plays_today: 'आज के खेल',
        from_referrals: 'रेफरल से',
        invite_friend: 'दोस्त को आमंत्रित करें = +1 अतिरिक्त खेल',
        share: 'शेयर करें',
        copied: 'आमंत्रण लिंक कॉपी हो गया!',
        questions: 'प्रश्न',
        questions_desc: 'बढ़ती कठिनाई के 15 ट्रिविया प्रश्नों के उत्तर दें। हर सही उत्तर आपको पुरस्कार सीढ़ी पर ऊपर ले जाता है। जैकपॉट जीतने के लिए सभी सही करें!',
        lifelines: 'लाइफलाइन',
        lifelines_desc: 'आपके पास प्रति राउंड 3 लाइफलाइन हैं: 50/50 दो गलत उत्तर हटाता है, हिंट आपको सुराग देता है, और Chain Scan दिखाता है समुदाय ने क्या जवाब दिया।',
        safe_havens: 'सुरक्षित ठिकाने',
        safe_havens_desc: 'प्रश्न 5 और 10 सुरक्षित ठिकाने हैं। यदि सुरक्षित ठिकाने तक पहुंचने के बाद गलत जवाब देते हैं, तो सब कुछ खोने की बजाय उस स्तर का पुरस्कार रखते हैं!',
      },

      // Game
      game: {
        question_of: 'प्रश्न {{current}} में से {{total}}',
        time_up: 'समय समाप्त!',
        correct: 'सही!',
        wrong: 'गलत!',
        jackie_says: 'Jackie कहते हैं:',
        chain_scan_results: 'Chain Scan परिणाम',
        players: 'खिलाड़ी',
        share_to_save: 'बचाने के लिए शेयर करें',
        share_to_save_desc: 'अपने सिक्के रखने के लिए गेम शेयर करें!',
        share_now: 'अभी शेयर करें',
        skip_share: 'छोड़ें',
        sharing: 'शेयर हो रहा है...',
        question_complete: 'प्रश्न {{number}} पूरा!',
        safe_haven: 'सुरक्षित ठिकाना!',
        safe_haven_note: 'यह एक सुरक्षित ठिकाना है! अगर बाद में हारते हैं, तो यह राशि रखेंगे।',
        claim_or_continue: 'अभी लें अपना इनाम सुरक्षित करने के लिए, या और जीतने के लिए आगे बढ़ें!',
        claim: 'लें',
        keep_going: 'आगे बढ़ें',
        your_progress: 'आपकी प्रगति',
      },

      // Lifelines
      lifelines: {
        fifty_fifty: '50/50',
        hint: 'हिंट',
        chain_scan: 'Chain Scan',
      },

      // Result
      result: {
        game_over: 'गेम ओवर',
        congratulations: 'बधाई हो!',
        you_won: 'आपने जीता',
        you_earned: 'आपने कमाया',
        claim_now: 'अभी लें',
        play_again: 'फिर से खेलें',
        go_home: 'होम जाएं',
        share_result: 'परिणाम शेयर करें',
      },

      // Profile
      profile: {
        title: 'प्रोफाइल',
        total_earned: 'कुल कमाई',
        current_streak: 'वर्तमान स्ट्रीक',
        days: 'दिन',
        total_runs: 'कुल राउंड',
        best_streak: 'सर्वश्रेष्ठ स्ट्रीक',
        best_question: 'सर्वश्रेष्ठ प्रश्न',
        referrals: 'रेफरल',
        best_win: 'सर्वश्रेष्ठ जीत',
        longest_streak: 'सबसे लंबी स्ट्रीक',
        day_streak: '{{count}} दिन स्ट्रीक',
        verified_world_id: 'World ID से सत्यापित',
        stats: 'आंकड़े',
        history: 'इतिहास',
      },

      // Leaderboard
      leaderboard: {
        title: 'लीडरबोर्ड',
        rank: 'रैंक',
        player: 'खिलाड़ी',
        earnings: 'कमाई',
        you: 'आप',
        share_rank: 'मेरी रैंक शेयर करें',
        yourRank: 'आपकी रैंक',
        airdropIn: '$JS Snapshot में',
        airdropDescription: 'शीर्ष पर पहुँचें और अपना $JS स्टैक बढ़ाएँ!',
        days: 'दिन',
        hrs: 'घंटे',
        min: 'मिनट',
        sec: 'सेकंड',
        invited: 'आमंत्रित',
        games: 'खेल',
        shareMyRank: 'मेरी रैंक शेयर करें',
        noClaims: 'अभी तक कोई दावा नहीं!',
        beFirst: 'पहले पुरस्कार प्राप्त करें।',
        players: 'खिलाड़ी',
        totalClaimed: 'कुल दावा',
      },

      // Verification
      verify: {
        title: 'World ID से सत्यापित करें',
        description: 'खेलना शुरू करने के लिए साबित करें कि आप एक अद्वितीय मनुष्य हैं',
        verifying: 'सत्यापित हो रहा है...',
        verify_button: 'World ID से सत्यापित करें',
        verified: 'सत्यापित!',
        welcome: 'Jackie Chain में आपका स्वागत है!',
      },

      // Notifications
      notifications: {
        title: 'अपडेट रहें!',
        description: 'दैनिक पुरस्कार, नए गेम और विशेष इवेंट के बारे में सूचनाएं प्राप्त करें।',
        enable: 'सूचनाएं सक्षम करें',
        skip: 'अभी छोड़ें',
        enabled: 'सूचनाएं सक्षम!',
        denied: 'सूचनाएं अस्वीकृत',
      },

      // Pool stats
      pool: {
        todays_pool: 'आज का पूल',
        remaining: 'शेष',
        locked: 'लॉक',
      },

      // Navigation
      nav: {
        home: 'होम',
        game: 'गेम',
        live: 'लाइव',
        leaderboard: 'लीडर',
        profile: 'प्रोफाइल',
      },

      // Trailer
      trailer: {
        watch_trailer: 'ट्रेलर देखें!',
        story: 'कहानी',
        referral: 'आमंत्रित',
      },
    },
  },
  id: {
    translation: {
      // Common
      app_name: 'Jackie Chain',
      subtitle: 'Jutawan',
      powered_by: 'Didukung oleh World ID • Hadiah di World Chain',
      banner_friends: '🤝 Ayo berteman di',
      
      // Home
      home: {
        win_jackpot: 'Menangkan 1M $JC!',
        description: 'Jawab 15 pertanyaan untuk naik tangga hadiah. Gunakan lifeline dengan bijak!',
        verify_to_play: 'Verifikasi untuk Main',
        start_run: 'Mulai Permainan',
        next_play_in: 'Main berikutnya dalam',
        login_world_id: 'Masuk dengan World ID',
        login_solana: 'Masuk dengan Solana',
        plays_today: 'Main Hari Ini',
        from_referrals: 'dari referral',
        invite_friend: 'Undang teman = +1 main ekstra',
        share: 'Bagikan',
        copied: 'Link undangan disalin!',
        questions: 'Pertanyaan',
        questions_desc: 'Jawab 15 pertanyaan trivia dengan tingkat kesulitan meningkat. Setiap jawaban benar membawa Anda naik tangga hadiah. Jawab semua dengan benar untuk memenangkan jackpot!',
        lifelines: 'Lifeline',
        lifelines_desc: 'Anda punya 3 lifeline per ronde: 50/50 menghapus dua jawaban salah, Petunjuk memberi isyarat, dan Chain Scan menunjukkan jawaban komunitas.',
        safe_havens: 'Zona Aman',
        safe_havens_desc: 'Pertanyaan 5 dan 10 adalah zona aman. Jika salah setelah mencapai zona aman, Anda menyimpan hadiah dari level itu alih-alih kehilangan semuanya!',
      },

      // Game
      game: {
        question_of: 'Pertanyaan {{current}} dari {{total}}',
        time_up: 'Waktu habis!',
        correct: 'Benar!',
        wrong: 'Salah!',
        jackie_says: 'Jackie berkata:',
        chain_scan_results: 'Hasil Chain Scan',
        players: 'pemain',
        share_to_save: 'Bagikan untuk Simpan',
        share_to_save_desc: 'Bagikan game untuk menyimpan koin Anda!',
        share_now: 'Bagikan Sekarang',
        skip_share: 'Lewati',
        sharing: 'Membagikan...',
        question_complete: 'Pertanyaan {{number}} selesai!',
        safe_haven: 'Zona Aman!',
        safe_haven_note: 'Ini adalah zona aman! Jika kalah nanti, Anda akan menyimpan jumlah ini.',
        claim_or_continue: 'Klaim sekarang untuk amankan hadiah, atau lanjutkan untuk lebih banyak!',
        claim: 'Klaim',
        keep_going: 'Lanjutkan',
        your_progress: 'Progres Anda',
      },

      // Lifelines
      lifelines: {
        fifty_fifty: '50/50',
        hint: 'Petunjuk',
        chain_scan: 'Chain Scan',
      },

      // Result
      result: {
        game_over: 'Game Selesai',
        congratulations: 'Selamat!',
        you_won: 'Anda Menang',
        you_earned: 'Anda Mendapat',
        claim_now: 'Klaim Sekarang',
        play_again: 'Main Lagi',
        go_home: 'Ke Beranda',
        share_result: 'Bagikan Hasil',
      },

      // Profile
      profile: {
        title: 'Profil',
        total_earned: 'Total Diperoleh',
        current_streak: 'Streak Saat Ini',
        days: 'hari',
        total_runs: 'Total Ronde',
        best_streak: 'Streak Terbaik',
        best_question: 'Pertanyaan Terbaik',
        referrals: 'Referral',
        best_win: 'Kemenangan Terbaik',
        longest_streak: 'Streak Terpanjang',
        day_streak: 'Streak {{count}} hari',
        verified_world_id: 'Terverifikasi dengan World ID',
        stats: 'Statistik',
        history: 'Riwayat',
      },

      // Leaderboard
      leaderboard: {
        title: 'Papan Peringkat',
        rank: 'Peringkat',
        player: 'Pemain',
        earnings: 'Penghasilan',
        you: 'Anda',
        share_rank: 'Bagikan peringkat saya',
        yourRank: 'Peringkat Anda',
        airdropIn: 'Snapshot $JS dalam',
        airdropDescription: 'Panjat ke puncak untuk meningkatkan tumpukan $JS Anda!',
        days: 'hari',
        hrs: 'jam',
        min: 'menit',
        sec: 'detik',
        invited: 'diundang',
        games: 'permainan',
        shareMyRank: 'Bagikan peringkat saya',
        noClaims: 'Belum ada klaim!',
        beFirst: 'Jadilah yang pertama mengklaim hadiah.',
        players: 'Pemain',
        totalClaimed: 'Total Diklaim',
      },

      // Verification
      verify: {
        title: 'Verifikasi dengan World ID',
        description: 'Buktikan Anda manusia unik untuk mulai bermain',
        verifying: 'Memverifikasi...',
        verify_button: 'Verifikasi dengan World ID',
        verified: 'Terverifikasi!',
        welcome: 'Selamat datang di Jackie Chain!',
      },

      // Notifications
      notifications: {
        title: 'Tetap Update!',
        description: 'Dapatkan notifikasi tentang hadiah harian, game baru, dan event spesial.',
        enable: 'Aktifkan Notifikasi',
        skip: 'Lewati dulu',
        enabled: 'Notifikasi diaktifkan!',
        denied: 'Notifikasi ditolak',
      },

      // Pool stats
      pool: {
        todays_pool: 'Pool Hari Ini',
        remaining: 'Tersisa',
        locked: 'Terkunci',
      },

      // Navigation
      nav: {
        home: 'Beranda',
        game: 'Game',
        live: 'Live',
        leaderboard: 'Peringkat',
        profile: 'Profil',
      },

      // Trailer
      trailer: {
        watch_trailer: 'Tonton Trailer!',
        story: 'Cerita',
        referral: 'Undang',
      },
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

// Helper to save language preference
export const setLanguage = (lang: Language) => {
  localStorage.setItem('jc_language', lang);
  i18n.changeLanguage(lang);
};

export const getCurrentLanguage = (): Language => {
  return (localStorage.getItem('jc_language') as Language) || 'en';
};
