// Advanced Chatbot with N8N-like functionality
class AdvancedChatbot {
    constructor() {
        this.context = {};
        this.conversationHistory = [];
        this.workflows = {
            serviceInquiry: this.handleServiceInquiry.bind(this),
            priceQuote: this.handlePriceQuote.bind(this),
            projectDiscussion: this.handleProjectDiscussion.bind(this),
            scheduling: this.handleScheduling.bind(this)
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadConversationHistory();
    }

    setupEventListeners() {
        const chatbotSend = document.getElementById('chatbot-send');
        const chatbotInput = document.getElementById('chatbot-input');
        
        chatbotSend.addEventListener('click', () => this.processMessage());
        chatbotInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.processMessage();
        });
    }

    processMessage() {
        const input = document.getElementById('chatbot-input');
        const message = input.value.trim();
        
        if (!message) return;

        this.addMessage(message, 'user');
        input.value = '';

        // Add typing indicator
        this.showTypingIndicator();

        // Process message with delay for realistic feel
        setTimeout(() => {
            this.hideTypingIndicator();
            const response = this.generateResponse(message);
            this.addMessage(response.text, 'bot');
            
            if (response.actions) {
                this.executeActions(response.actions);
            }
        }, 1500);

        // Save to history
        this.conversationHistory.push({
            user: message,
            timestamp: new Date().toISOString()
        });
    }

    generateResponse(message) {
        const intent = this.detectIntent(message);
        const entities = this.extractEntities(message);
        
        this.context = { ...this.context, ...entities };

        switch (intent) {
            case 'greeting':
                return this.handleGreeting();
            case 'service_inquiry':
                return this.workflows.serviceInquiry(entities);
            case 'price_inquiry':
                return this.workflows.priceQuote(entities);
            case 'project_discussion':
                return this.workflows.projectDiscussion(entities);
            case 'scheduling':
                return this.workflows.scheduling(entities);
            case 'contact_info':
                return this.handleContactInfo();
            case 'portfolio_request':
                return this.handlePortfolioRequest(entities);
            default:
                return this.handleDefault(message);
        }
    }

    detectIntent(message) {
        const lowerMessage = message.toLowerCase();
        
        const intentPatterns = {
            greeting: /\b(hello|hi|hey|good morning|good afternoon|good evening)\b/,
            service_inquiry: /\b(service|video editing|photography|web design|software|what do you do|what services)\b/,
            price_inquiry: /\b(price|cost|rate|how much|pricing|budget|quote)\b/,
            project_discussion: /\b(project|work|need|want|looking for|require)\b/,
            scheduling: /\b(schedule|appointment|meeting|call|when|available|time)\b/,
            contact_info: /\b(contact|phone|email|address|location|reach)\b/,
            portfolio_request: /\b(portfolio|work|examples|previous|samples|gallery)\b/
        };

        for (const [intent, pattern] of Object.entries(intentPatterns)) {
            if (pattern.test(lowerMessage)) {
                return intent;
            }
        }

        return 'default';
    }

    extractEntities(message) {
        const entities = {};
        const lowerMessage = message.toLowerCase();

        // Extract services
        const services = ['video editing', 'video mixing', 'photography', 'web design', 'software development', 'videography'];
        services.forEach(service => {
            if (lowerMessage.includes(service)) {
                entities.service = service;
            }
        });

        // Extract project types
        const projectTypes = ['wedding', 'corporate', 'commercial', 'event', 'product', 'portrait'];
        projectTypes.forEach(type => {
            if (lowerMessage.includes(type)) {
                entities.projectType = type;
            }
        });

        // Extract urgency
        if (lowerMessage.includes('urgent') || lowerMessage.includes('asap') || lowerMessage.includes('quickly')) {
            entities.urgency = 'high';
        }

        // Extract budget indicators
        const budgetPatterns = /\$(\d+)|(\d+)\s*(dollar|rupee|rs)/i;
        const budgetMatch = message.match(budgetPatterns);
        if (budgetMatch) {
            entities.budget = budgetMatch[0];
        }

        return entities;
    }

    handleGreeting() {
        const greetings = [
            "Hello! Welcome to Creative Studio. I'm here to help you with our video editing, photography, and digital services. What can I assist you with today?",
            "Hi there! I'm your virtual assistant for Creative Studio. We specialize in video production, photography, and web development. How can I help you?",
            "Welcome! I'm excited to help you explore our creative services. Whether you need video editing, photography, or web design, I'm here to guide you."
        ];

        return {
            text: greetings[Math.floor(Math.random() * greetings.length)],
            actions: ['showServiceOptions']
        };
    }

    handleServiceInquiry(entities) {
        if (entities.service) {
            const serviceDetails = {
                'video editing': {
                    description: "Our video editing services include professional post-production, color correction, motion graphics, sound design, and seamless transitions. We work with 4K footage and deliver in any format you need.",
                    features: ["Color Grading", "Motion Graphics", "Sound Design", "Multi-camera Editing"],
                    timeline: "3-7 days depending on complexity"
                },
                'video mixing': {
                    description: "Professional video mixing combining multiple sources, live streaming setup, and real-time effects. Perfect for events, presentations, and live broadcasts.",
                    features: ["Multi-source Mixing", "Live Effects", "Audio Synchronization", "Streaming Integration"],
                    timeline: "Same day for live events, 2-3 days for post-production"
                },
                'photography': {
                    description: "Professional photography services covering events, portraits, commercial shoots, and product photography. We provide edited high-resolution images.",
                    features: ["Event Coverage", "Portrait Sessions", "Product Photography", "Commercial Shoots"],
                    timeline: "Photos delivered within 48 hours, edited within 5 days"
                },
                'web design': {
                    description: "Modern, responsive websites built with the latest technologies. We create custom designs that engage your audience and drive results.",
                    features: ["Responsive Design", "E-commerce Integration", "SEO Optimization", "Custom Development"],
                    timeline: "2-4 weeks depending on complexity"
                },
                'software development': {
                    description: "Custom software solutions including desktop applications, mobile apps, and web-based systems tailored to your business needs.",
                    features: ["Custom Applications", "Database Design", "API Integration", "Cloud Solutions"],
                    timeline: "4-12 weeks depending on scope"
                }
            };

            const service = serviceDetails[entities.service];
            return {
                text: `Great choice! Here's what we offer for ${entities.service}:\n\n${service.description}\n\nKey Features:\n${service.features.map(f => `• ${f}`).join('\n')}\n\nTypical Timeline: ${service.timeline}\n\nWould you like to discuss your specific project requirements or get a quote?`,
                actions: ['showPricingOptions']
            };
        }

        return {
            text: "We offer several creative services:\n\n🎬 Video Editing & Mixing\n📸 Photography & Videography\n💻 Website Design\n⚙️ Software Development\n\nWhich service interests you most? I can provide detailed information about any of these.",
            actions: ['showServiceDetails']
        };
    }

    handlePriceQuote(entities) {
        let response = "I'd be happy to provide pricing information! Our rates vary based on project complexity and requirements.\n\n";

        if (entities.service) {
            const pricing = {
                'video editing': "Video editing starts at $50/hour or $500 for basic projects. Complex projects with motion graphics range from $1000-$5000.",
                'photography': "Photography sessions start at $200 for 2 hours. Event coverage ranges from $500-$2000 depending on duration and deliverables.",
                'web design': "Website design starts at $1500 for basic sites. E-commerce and custom applications range from $3000-$15000.",
                'software development': "Software development starts at $75/hour. Project-based pricing ranges from $5000-$50000 depending on complexity."
            };

            response += `For ${entities.service}:\n${pricing[entities.service]}\n\n`;
        } else {
            response += "Here's our general pricing structure:\n\n";
            response += "🎬 Video Editing: $50-100/hour\n";
            response += "📸 Photography: $200-500/session\n";
            response += "💻 Web Design: $1500-15000/project\n";
            response += "⚙️ Software Dev: $75-150/hour\n\n";
        }

        response += "For an accurate quote, I'll need to know more about your project. Would you like to schedule a consultation call?";

        return {
            text: response,
            actions: ['collectProjectDetails']
        };
    }

    handleProjectDiscussion(entities) {
        let response = "Excellent! I'd love to learn more about your project. ";

        if (entities.service && entities.projectType) {
            response += `A ${entities.projectType} ${entities.service} project sounds exciting! `;
        }

        response += "To provide the best recommendations and accurate pricing, could you tell me:\n\n";
        response += "1. What's the scope of your project?\n";
        response += "2. What's your timeline?\n";
        response += "3. Do you have a budget range in mind?\n";
        response += "4. Any specific requirements or preferences?\n\n";
        response += "Feel free to share as much detail as you'd like!";

        return {
            text: response,
            actions: ['startProjectForm']
        };
    }

    handleScheduling(entities) {
        return {
            text: "I'd be happy to help you schedule a consultation! We're available:\n\n📅 Monday-Friday: 9 AM - 6 PM\n📅 Saturday: 10 AM - 4 PM\n📅 Sunday: By appointment\n\nWould you prefer:\n• Phone consultation (15-30 minutes)\n• Video call meeting (30-60 minutes)\n• In-person meeting (if you're in Kathmandu)\n\nWhat works best for your schedule?",
            actions: ['showCalendar']
        };
    }

    handleContactInfo() {
        return {
            text: "Here's how you can reach us:\n\n📞 Phone: +977-9800000000\n📧 Email: info@creativestudio.com\n📍 Location: Kathmandu, Nepal\n\n🕒 Business Hours:\nMon-Fri: 9 AM - 6 PM\nSat: 10 AM - 4 PM\nSun: By appointment\n\nWe typically respond to emails within 2 hours during business hours. Would you like to schedule a call or send us a message?",
            actions: ['showContactOptions']
        };
    }

    handlePortfolioRequest(entities) {
        let response = "I'd love to show you our work! Our portfolio includes:\n\n";
        
        if (entities.service) {
            response += `Here are some examples of our ${entities.service} work:\n\n`;
        }

        response += "🎬 Video Projects: Corporate videos, wedding films, commercials\n";
        response += "📸 Photography: Events, portraits, product shoots\n";
        response += "💻 Websites: E-commerce, portfolios, business sites\n";
        response += "⚙️ Software: Custom apps, automation tools\n\n";
        response += "You can view our full portfolio on the website above, or I can send you specific examples. What type of work would you like to see?";

        return {
            text: response,
            actions: ['showPortfolioLinks']
        };
    }

    handleDefault(message) {
        const responses = [
            "That's interesting! Could you tell me more about what you're looking for? I can help with video editing, photography, web design, or software development.",
            "I want to make sure I understand your needs correctly. Are you interested in our creative services, or do you have a specific question?",
            "I'm here to help with any questions about our services. What would you like to know more about?"
        ];

        return {
            text: responses[Math.floor(Math.random() * responses.length)]
        };
    }

    executeActions(actions) {
        actions.forEach(action => {
            switch (action) {
                case 'showServiceOptions':
                    this.showQuickReplies(['Video Editing', 'Photography', 'Web Design', 'Software Development']);
                    break;
                case 'showPricingOptions':
                    this.showQuickReplies(['Get Quote', 'View Packages', 'Schedule Call']);
                    break;
                case 'collectProjectDetails':
                    this.showProjectForm();
                    break;
                case 'showContactOptions':
                    this.showQuickReplies(['Schedule Call', 'Send Email', 'WhatsApp']);
                    break;
            }
        });
    }

    showQuickReplies(options) {
        setTimeout(() => {
            const quickReplies = document.createElement('div');
            quickReplies.className = 'quick-replies';
            quickReplies.innerHTML = options.map(option => 
                `<button class="quick-reply-btn" onclick="advancedChatbot.handleQuickReply('${option}')">${option}</button>`
            ).join('');
            
            document.getElementById('chatbot-messages').appendChild(quickReplies);
            this.scrollToBottom();
        }, 500);
    }

    handleQuickReply(option) {
        // Remove quick replies
        const quickReplies = document.querySelector('.quick-replies');
        if (quickReplies) quickReplies.remove();
        
        // Process as user message
        this.addMessage(option, 'user');
        
        setTimeout(() => {
            const response = this.generateResponse(option);
            this.addMessage(response.text, 'bot');
            if (response.actions) {
                this.executeActions(response.actions);
            }
        }, 1000);
    }

    showProjectForm() {
        setTimeout(() => {
            const form = document.createElement('div');
            form.className = 'chatbot-form';
            form.innerHTML = `
                <div class="form-header">Project Details</div>
                <input type="text" placeholder="Project type" id="project-type">
                <input type="text" placeholder="Timeline" id="project-timeline">
                <input type="text" placeholder="Budget range" id="project-budget">
                <textarea placeholder="Additional details" id="project-details"></textarea>
                <button onclick="advancedChatbot.submitProjectForm()">Submit</button>
            `;
            
            document.getElementById('chatbot-messages').appendChild(form);
            this.scrollToBottom();
        }, 500);
    }

    submitProjectForm() {
        const projectType = document.getElementById('project-type').value;
        const timeline = document.getElementById('project-timeline').value;
        const budget = document.getElementById('project-budget').value;
        const details = document.getElementById('project-details').value;

        // Remove form
        document.querySelector('.chatbot-form').remove();

        // Process submission
        const summary = `Project Type: ${projectType}\nTimeline: ${timeline}\nBudget: ${budget}\nDetails: ${details}`;
        this.addMessage(summary, 'user');

        setTimeout(() => {
            this.addMessage("Thank you for the detailed information! Based on your requirements, I'll connect you with our project manager who will provide a customized proposal within 24 hours. Would you like to schedule a call to discuss this further?", 'bot');
            this.showQuickReplies(['Schedule Call', 'Send Email', 'Get Instant Quote']);
        }, 1500);
    }

    addMessage(message, sender) {
        const messagesContainer = document.getElementById('chatbot-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = sender === 'user' ? 'user-message' : 'bot-message';
        messageDiv.innerHTML = `<p>${message}</p>`;
        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
        document.getElementById('chatbot-messages').appendChild(indicator);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const indicator = document.querySelector('.typing-indicator');
        if (indicator) indicator.remove();
    }

    scrollToBottom() {
        const messages = document.getElementById('chatbot-messages');
        messages.scrollTop = messages.scrollHeight;
    }

    loadConversationHistory() {
        const saved = localStorage.getItem('chatbot-history');
        if (saved) {
            this.conversationHistory = JSON.parse(saved);
        }
    }

    saveConversationHistory() {
        localStorage.setItem('chatbot-history', JSON.stringify(this.conversationHistory));
    }
}

// Initialize advanced chatbot
const advancedChatbot = new AdvancedChatbot();