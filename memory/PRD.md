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
- Модулі: auth, customers, leads, deals, deposits, staff, notifications, kpi, payments, shipping, payment-flow, contracts та інші

### Frontend (/app/frontend)
- React 19 + TypeScript/JSX
- Tailwind CSS + Radix UI components
- Framer Motion анімації
- i18n підтримка (UA, EN, BG)

## Що реалізовано

### ✅ Завершені функції (31.03.2026)

1. **Dashboard (Панель контролю)**
   - KPI метрики: ліди, депозити, верифікація
   - SLA контроль, потік лідів
   - Контроль зворотних дзвінків

2. **Team Lead Panel** `/admin/team-lead`
   - KPI dashboard з 4 метриками
   - Таблиця активності команди
   - Запити на вхід (approval/reject)

3. **CRM модулі**
   - Ліди (leads management)
   - Клієнти (customers)
   - Угоди (deals)
   - Депозити (deposits)

4. **Settings > Інтеграції**
   - Stripe, DocuSign, Ringostat, OpenAI, Telegram Bot
   - Meta Ads API, Facebook Conversion API

5. **Тестові клієнти** (5 шт.)

### ✅ Payment Flow Engine (NEW - 31.03.2026)

**Модуль: /modules/payment-flow**

PaymentFlowState Entity:
- dealId, userId, managerId
- currentStep: deal_created -> contract_signed -> deposit_paid -> lot_paid -> ...
- Payment gates: contractSigned, depositPaid, lotPaid, customsPaid, etc.
- Blocking logic: nextAllowedStep, blockedReason
- Invoice tracking: paidInvoiceIds, pendingInvoiceIds, overdueInvoiceIds

Business Rules:
- Contract MUST be signed before creating invoices
- Deposit invoice MUST be paid before shipment starts
- Lot payment MUST be paid before loading on vessel
- Customs invoice MUST be paid before ready for pickup

### ✅ Universal Invoice Engine (NEW - 31.03.2026)

**Updated Module: /modules/payments**

Invoice Entity (Extended):
- dealId, userId, managerId, shipmentId
- type: deposit | lot_payment | auction_fee | logistics | customs | delivery | service_fee | other
- status: draft | sent | pending | paid | overdue | cancelled | expired
- requiredForNextStep: boolean
- stepKey: links invoice to payment flow step
- Stripe integration: sessionId, paymentIntentId, checkoutUrl
- Reminder tracking: remindersSent, lastReminderAt

API Endpoints:
- POST /api/invoices/create - create with step blocking check
- PATCH /api/invoices/:id/send - change status to sent
- PATCH /api/invoices/:id/cancel - cancel invoice
- PATCH /api/invoices/:id/mark-paid - manual mark as paid
- POST /api/invoices/checkout - create Stripe session
- GET /api/invoices/admin/overdue - get overdue invoices
- GET /api/invoices/admin/analytics - payment analytics

### ✅ Enhanced Shipping Module (NEW - 31.03.2026)

**Updated Module: /modules/shipping**

Shipment Entity (Extended):
- Full lifecycle: deal_created -> contract_signed -> deposit_paid -> lot_paid -> transport_to_port -> at_origin_port -> loaded_on_vessel -> in_transit -> at_destination_port -> customs -> ready_for_pickup -> delivered
- trackingMode: manual | api | hybrid
- trackingActive: boolean (auto-set based on status)
- eta, currentPort, vesselName, vesselImo, containerNumber

ShipmentEvent Entity (NEW):
- shipmentId, eventType, title, description
- location, eventDate, source (manager | system | provider)

Integration with PaymentFlow:
- Status changes validated against payment gates
- Tracking becomes active only after lot_paid
- Status blocked if required invoice not paid

API Endpoints:
- GET /api/shipping/me - user's shipments
- GET /api/shipping/deal/:dealId - shipment by deal
- PATCH /api/shipping/:id/status - update with payment check
- PATCH /api/shipping/:id/eta - update ETA
- PATCH /api/shipping/:id/container - update container info
- GET/POST /api/shipping/:id/events - event timeline
- GET /api/shipping/admin/delayed - delayed shipments
- GET /api/shipping/admin/analytics - shipping analytics

### Customer Cabinet Pages

- /cabinet/shipping - Shipment tracking with timeline
- /cabinet/invoices - Invoice list with Stripe payment
- /cabinet/contracts - Contract signing (DocuSign)

### User Personas
- **Owner**: Повний доступ до всіх функцій
- **Team Lead**: Управління командою, схвалення входів
- **Manager**: Робота з лідами, клієнтами, shipment updates
- **Customer**: Особистий кабінет, оплата, трекінг

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
- ✅ Payment Flow Engine
- ✅ Universal Invoice Engine
- ✅ Enhanced Shipping with events
- ✅ Step blocking logic
- ✅ Customer cabinet shipping/invoices

### P1 (To Do)
- Invoice reminders (24h, due date, overdue)
- Notification integration for payment events
- Manager invoice control board
- Owner payment analytics dashboard

### P2 (Production Keys Required)
- DocuSign production integration
- Stripe production payments
- Ringostat call tracking

### P3 (Future)
- Provider API integration (MarineTraffic, ShipsGo)
- Live vessel tracking map
- WhatsApp Business integration
- Mobile App

## Definition of Done

Блок вважається закритим, якщо:

**Shipping:**
- ✅ manager can create/update shipment
- ✅ customer sees shipment timeline
- ✅ ETA and ports visible
- ✅ shipment events stored and shown

**Invoices:**
- ✅ manager can create invoice
- ✅ user can pay via Stripe
- ✅ unpaid required invoice blocks next step
- ⬜ overdue reminders work

**Flow:**
- ✅ contract signed gates payment
- ✅ payment gates shipment progress
- ✅ shipment status updates visible in cabinet
- ⬜ owner/team lead dashboards show delays/unpaid

---
_Last updated: 31.03.2026 21:55 UTC_
