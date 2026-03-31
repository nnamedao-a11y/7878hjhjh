# BIBI Cars CRM - PRD (Product Requirements Document)

## Оригінальна задача
CRM система для автосалону BIBI Cars з 4 кабінетами (Customer, Manager, Team Lead, Owner).

## Архітектура
- **Frontend**: React.js 19, Tailwind CSS, Framer Motion, Radix UI
- **Backend**: NestJS (TypeScript) з FastAPI proxy
- **Database**: MongoDB
- **Інтеграції**: Stripe, DocuSign, Ringostat, Telegram, OpenAI, Meta Ads

## Структура проєкту

### Backend (/app/backend)
- NestJS з ~80 модулями
- server.py - FastAPI proxy для запуску NestJS
- Модулі: auth, customers, leads, deals, deposits, staff, notifications, kpi, та інші

### Frontend (/app/frontend)
- React 19 + TypeScript/JSX
- Tailwind CSS + Radix UI components
- Framer Motion анімації
- i18n підтримка (UA, EN, BG)

## Що реалізовано (31.03.2026)

### ✅ Завершені функції

1. **Dashboard (Панель контролю)**
   - KPI метрики: ліди, депозити, верифікація
   - SLA контроль, потік лідів
   - Контроль зворотних дзвінків

2. **Team Lead Panel** `/admin/team-lead`
   - KPI dashboard з 4 метриками (менеджери, ліди, угоди, дзвінки)
   - Таблиця активності команди
   - Запити на вхід (approval/reject)
   - Доступ: owner, team_lead

3. **CRM модулі**
   - Ліди (leads management)
   - Клієнти (customers)
   - Угоди (deals)
   - Депозити (deposits)

4. **Settings > Інтеграції**
   - Stripe (Secret Key, Publishable Key, Webhook Secret)
   - DocuSign (Integration Key, Account ID, User ID)
   - Ringostat (API Key, Account ID)
   - OpenAI (API Key)
   - Telegram Bot (Bot Token)
   - Meta Ads API, Facebook Conversion API

5. **Тестові клієнти** (5 шт.)
   - Олександр Петренко (o.petrenko@gmail.com)
   - Марія Коваленко (m.kovalenko@ukr.net) - VIP
   - Іван Сидоренко (ivan.sydorenko@company.ua) - Компанія
   - Наталія Бондаренко (natalia.b@outlook.com)
   - Дмитро Шевченко (d.shevchenko@gmail.com)

6. **Публічна частина**
   - Landing page з VIN пошуком
   - Автомобілі, колекції
   - Калькулятор вартості

### User Personas
- **Owner**: Повний доступ до всіх функцій
- **Team Lead**: Управління командою, схвалення входів
- **Manager**: Робота з лідами, клієнтами
- **Customer**: Особистий кабінет клієнта

## Технічні деталі

### Credentials для тестування
- Admin: admin@crm.com / admin123
- Team Lead: teamlead@crm.com / staff123
- Manager: manager1@crm.com / staff123

### Environment
- Backend port: 8002 (NestJS), 8001 (FastAPI proxy)
- Frontend port: 3000
- MongoDB: localhost:27017, DB: bibi_crm

## Пріоритезований Backlog

### P0 (Done)
- ✅ Team Lead Panel
- ✅ Test customers seeded
- ✅ Settings > Integrations UI
- ✅ Dashboard working
- ✅ Customers, Leads, Deals modules

### P1 (In Progress)
- Team Lead Panel link in sidebar (need to verify visibility)
- Real-time KPI calculations

### P2 (Production Keys Required)
- DocuSign production integration
- Stripe production payments
- Ringostat call tracking

### P3 (Future)
- Mobile App
- Advanced analytics
- WhatsApp Business integration
- Multi-language support (partial)

## Next Tasks
1. Verify Team Lead Panel link in sidebar menu
2. Test Stripe payments with test keys
3. Add real leads/deals data to KPI calculations
4. Implement WhatsApp Business integration

---
_Last updated: 31.03.2026 21:15 UTC_
