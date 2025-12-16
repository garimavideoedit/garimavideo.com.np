// Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Portfolio Filter
const filterBtns = document.querySelectorAll('.filter-btn');
const portfolioItems = document.querySelectorAll('.portfolio-item');

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons
        filterBtns.forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        btn.classList.add('active');
        
        const filter = btn.getAttribute('data-filter');
        
        portfolioItems.forEach(item => {
            if (filter === 'all' || item.getAttribute('data-category') === filter) {
                item.style.display = 'block';
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'scale(1)';
                }, 100);
            } else {
                item.style.opacity = '0';
                item.style.transform = 'scale(0.8)';
                setTimeout(() => {
                    item.style.display = 'none';
                }, 300);
            }
        });
    });
});

// Contact Form - AJAX Submission
const contactForm = document.getElementById('contact-form');
const formStatus = document.getElementById('form-status');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = contactForm.querySelector('input[name="name"]').value;
        const email = contactForm.querySelector('input[name="email"]').value;
        const service = contactForm.querySelector('select[name="service"]').value;
        const message = contactForm.querySelector('textarea[name="message"]').value;
        
        if (!name || !email || !service || !message) {
            showStatus('Please fill in all fields', 'error');
            return;
        }
        
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
        
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('email', email);
            formData.append('service', service);
            formData.append('message', message);
            formData.append('_subject', 'New Contact Form Submission');
            formData.append('_captcha', 'false');
            formData.append('_template', 'table');
            
            const response = await fetch('https://formsubmit.co/garimavideomixing@gmail.com', {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                showStatus('Message sent successfully! We will get back to you soon.', 'success');
                contactForm.reset();
            } else {
                showStatus('Failed to send message. Please try again.', 'error');
            }
        } catch (error) {
            showStatus('Network error. Please check your connection.', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

function showStatus(message, type) {
    formStatus.textContent = message;
    formStatus.style.display = 'block';
    formStatus.style.background = type === 'success' ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)';
    formStatus.style.color = type === 'success' ? '#00ff00' : '#ff0000';
    formStatus.style.border = type === 'success' ? '2px solid #00ff00' : '2px solid #ff0000';
    
    setTimeout(() => {
        formStatus.style.display = 'none';
    }, 5000);
}

// WhatsApp Chat Widget
const chatbotToggle = document.getElementById('chatbot-toggle');
const chatbotWindow = document.getElementById('chatbot-window');
const chatbotClose = document.getElementById('chatbot-close');
const chatbotInput = document.getElementById('chatbot-input');
const chatbotSend = document.getElementById('chatbot-send');
const chatbotMessages = document.getElementById('chatbot-messages');
let messageCount = 0;
const whatsappNumber = '9779852688256';



// Toggle widget
if (chatbotToggle) {
    chatbotToggle.addEventListener('click', () => {
        chatbotWindow.style.display = chatbotWindow.style.display === 'flex' ? 'none' : 'flex';
    });
}

if (chatbotClose) {
    chatbotClose.addEventListener('click', () => {
        chatbotWindow.style.display = 'none';
    });
}

// Handle message sending
function sendChatMessage() {
    const message = chatbotInput.value.trim();
    if (!message) return;
    
    // Add user message
    addChatMessage(message, 'user');
    chatbotInput.value = '';
    
    messageCount++;
    
    // Show typing indicator
    setTimeout(() => {
        if (messageCount === 1) {
            // First message - auto reply
            addChatMessage('Thank you for your message! 😊\n\nTo continue our conversation and get instant replies, please click the button below to chat with us on WhatsApp.', 'bot');
            
            // Add WhatsApp button
            setTimeout(() => {
                const whatsappBtn = document.createElement('div');
                whatsappBtn.className = 'whatsapp-button';
                whatsappBtn.innerHTML = `
                    <button onclick="openWhatsApp()">
                        <i class="fab fa-whatsapp"></i> Continue on WhatsApp
                    </button>
                `;
                chatbotMessages.appendChild(whatsappBtn);
                chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
            }, 500);
        } else {
            // Second message onwards - redirect to WhatsApp
            openWhatsApp(message);
        }
    }, 1000);
}

function addChatMessage(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = sender === 'user' ? 'user-message' : 'bot-message';
    messageDiv.innerHTML = `<p>${message.replace(/\n/g, '<br>')}</p>`;
    chatbotMessages.appendChild(messageDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function openWhatsApp(customMessage = '') {
    const defaultMessage = 'Hello! I visited your website and would like to know more about your services.';
    const message = customMessage || defaultMessage;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

if (chatbotSend) {
    chatbotSend.addEventListener('click', sendChatMessage);
}

if (chatbotInput) {
    chatbotInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
}

// Video Slideshow
let currentVideoSlide = 0;
const videoSlides = document.querySelectorAll('.video-slide');
const totalVideoSlides = videoSlides.length;

if (videoSlides.length > 0) {
    function showVideoSlide(index) {
        videoSlides.forEach((video, i) => {
            video.classList.remove('active');
            video.pause();
        });
        videoSlides[index].classList.add('active');
        videoSlides[index].play();
    }

    function nextVideoSlide() {
        currentVideoSlide = (currentVideoSlide + 1) % totalVideoSlides;
        showVideoSlide(currentVideoSlide);
    }

    // Change video every 10 seconds
    setInterval(nextVideoSlide, 10000);
    
    // Start first video
    videoSlides[0].play();
}

// Scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
const elementsToAnimate = document.querySelectorAll('.service-card, .portfolio-item, .about-content, .contact-content');
if (elementsToAnimate.length > 0) {
    elementsToAnimate.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Scroll to top on page load
window.addEventListener('load', () => {
    window.scrollTo(0, 0);
});

// Navbar background on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// About Section Slideshow
let currentAboutSlide = 0;
const aboutSlides = document.querySelectorAll('.about-slide');

if (aboutSlides.length > 0) {
    function showAboutSlide(index) {
        aboutSlides.forEach(slide => slide.classList.remove('active'));
        aboutSlides[index].classList.add('active');
    }

    function nextAboutSlide() {
        currentAboutSlide = (currentAboutSlide + 1) % aboutSlides.length;
        showAboutSlide(currentAboutSlide);
    }

    setInterval(nextAboutSlide, 3000);
}

// Counter animation for stats
function animateCounters() {
    const counters = document.querySelectorAll('.stat h3');
    counters.forEach(counter => {
        const target = parseInt(counter.textContent);
        const increment = target / 100;
        let current = 0;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                counter.textContent = target + '+';
                clearInterval(timer);
            } else {
                counter.textContent = Math.floor(current) + '+';
            }
        }, 20);
    });
}

// Trigger counter animation when stats section is visible
const statsSection = document.querySelector('.stats');
if (statsSection) {
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                statsObserver.unobserve(entry.target);
            }
        });
    });
    statsObserver.observe(statsSection);
}