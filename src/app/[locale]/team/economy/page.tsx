"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { useTeam } from "@/lib/team-context";
import { CreditCard, Clock, TrendingUp, Wallet, Receipt, CheckCircle2 } from "lucide-react";

type OrderLine = {
  productName: string;
  productNameRu: string | null;
  productNameEt: string | null;
  category: string;
  quantity: number;
  unitPrice: string;
  total: string;
};

type Payment = {
  id: number;
  amount: string;
  currency: string;
  method: string;
  status: string;
  reference: string | null;
  notes: string | null;
  receivedAt: string | null;
  createdAt: string;
};

type EconomyData = {
  orders: OrderLine[];
  payments: Payment[];
  totalToPay: string;
  totalPaid: string;
  balance: string;
};

export default function EconomyPage() {
  const t = useTranslations("economy");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { teamId } = useTeam();
  const [data, setData] = useState<EconomyData | null>(null);

  useEffect(() => {
    if (!teamId) return;
    setData(null);
    fetch(`/api/teams/${teamId}/economy`).then(async (res) => {
      if (res.ok) setData(await res.json());
    });
  }, [teamId]);

  if (!data) return null;

  function getLocalName(order: OrderLine) {
    if (locale === "ru" && order.productNameRu) return order.productNameRu;
    if (locale === "et" && order.productNameEt) return order.productNameEt;
    return order.productName;
  }

  const balanceNum = parseFloat(data.balance);
  const totalToPay = parseFloat(data.totalToPay);
  const totalPaid = parseFloat(data.totalPaid);
  const paidPercent = totalToPay > 0 ? Math.min(100, Math.round((totalPaid / totalToPay) * 100)) : 0;

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── Заголовок страницы ── */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold th-text">{t("title")}</h1>
        <p className="text-sm th-text-2 mt-1">{t("description")}</p>
      </div>

      {/* ── Три карточки сводки ── */}
      <div className="grid grid-cols-3 gap-3">
        {/* Заказано */}
        <div className="th-card rounded-2xl border th-border p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold th-text-2 uppercase tracking-wider">{t("totalToPay")}</p>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)" }}>
              <Receipt className="w-3.5 h-3.5" style={{ color: "rgb(99,102,241)" }} />
            </div>
          </div>
          <p className="text-2xl font-bold th-text">{totalToPay.toFixed(0)}<span className="text-sm font-normal th-text-2 ml-1">{tc("euro")}</span></p>
        </div>

        {/* Оплачено */}
        <div className="th-card rounded-2xl border th-border p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold th-text-2 uppercase tracking-wider">{t("received")}</p>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--badge-success-bg)" }}>
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "var(--badge-success-color)" }} />
            </div>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--badge-success-color)" }}>{totalPaid.toFixed(0)}<span className="text-sm font-normal th-text-2 ml-1">{tc("euro")}</span></p>
        </div>

        {/* Баланс */}
        <div className="rounded-2xl border p-4 shadow-sm" style={{
          background: balanceNum >= 0 ? "var(--badge-success-bg)" : "var(--badge-error-bg)",
          borderColor: balanceNum >= 0 ? "var(--badge-success-border)" : "var(--badge-error-border)",
        }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold th-text-2 uppercase tracking-wider">{t("balance")}</p>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center th-card border th-border">
              <Wallet className="w-3.5 h-3.5 th-text-2" />
            </div>
          </div>
          <p className="text-2xl font-bold" style={{ color: balanceNum >= 0 ? "var(--badge-success-color)" : "var(--badge-error-color)" }}>
            {balanceNum >= 0 ? "+" : ""}{balanceNum.toFixed(0)}<span className="text-sm font-normal th-text-2 ml-1">{tc("euro")}</span>
          </p>
        </div>
      </div>

      {/* ── Прогресс оплаты ── */}
      {totalToPay > 0 && (
        <div className="th-card rounded-2xl border th-border shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 th-text-2" />
              <p className="text-sm font-semibold th-text">{t("received")}</p>
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--cat-accent)" }}>{paidPercent}%</span>
          </div>
          <div className="w-full h-2 th-bg rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${paidPercent}%`, background: "var(--cat-accent)", boxShadow: "0 0 8px var(--cat-accent-glow)" }}
            />
          </div>
          <p className="text-xs th-text-2 mt-2">{totalPaid.toFixed(0)} {tc("euro")} / {totalToPay.toFixed(0)} {tc("euro")}</p>
        </div>
      )}

      {/* ── Детализация заказов ── */}
      {data.orders.length > 0 && (
        <div className="th-card rounded-2xl border th-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b th-border flex items-center gap-2">
            <Receipt className="w-4 h-4 th-text-2" />
            <p className="text-sm font-semibold th-text">{t("subtotal")}</p>
          </div>
          <div className="divide-y divide-[var(--cat-card-border)]">
            {data.orders.map((order, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:opacity-80 transition-opacity">
                <div>
                  <p className="text-sm font-medium th-text">{getLocalName(order)}</p>
                  <p className="text-xs th-text-2 mt-0.5">
                    {order.quantity} × {parseFloat(order.unitPrice).toFixed(0)} {tc("euro")}
                  </p>
                </div>
                <p className="text-sm font-semibold th-text">{parseFloat(order.total).toFixed(0)} <span className="th-text-2 font-normal">{tc("euro")}</span></p>
              </div>
            ))}
            {/* Итого строка */}
            <div className="flex items-center justify-between px-5 py-4" style={{ background: "var(--cat-bg)" }}>
              <p className="text-sm font-bold th-text">{t("totalToPay")}</p>
              <p className="text-lg font-bold" style={{ color: "var(--cat-accent)" }}>{totalToPay.toFixed(0)} {tc("euro")}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── История платежей ── */}
      {data.payments.length > 0 && (
        <div className="th-card rounded-2xl border th-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b th-border flex items-center gap-2">
            <CreditCard className="w-4 h-4 th-text-2" />
            <p className="text-sm font-semibold th-text">{t("received")}</p>
          </div>
          <div className="divide-y divide-[var(--cat-card-border)]">
            {data.payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center th-bg border th-border">
                    <Clock className="w-3.5 h-3.5 th-text-2" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold th-text">{parseFloat(payment.amount).toFixed(0)} {payment.currency}</p>
                    {payment.reference && (
                      <p className="text-xs th-text-2 mt-0.5">{payment.reference}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={payment.status === "received" ? "success" : "warning"}>
                    {payment.status}
                  </Badge>
                  {payment.receivedAt && (
                    <p className="text-xs th-text-2 mt-1">
                      {new Date(payment.receivedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
