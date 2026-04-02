"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTeam } from "@/lib/team-context";
import { CreditCard, Clock } from "lucide-react";

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

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>

        {/* Orders breakdown */}
        {data.orders.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-navy mb-3">{t("subtotal")}</h3>
            <div className="space-y-2">
              {data.orders.map((order, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg th-bg">
                  <div>
                    <p className="text-sm font-medium">{getLocalName(order)}</p>
                    <p className="text-xs th-text-2">
                      {order.quantity} × {parseFloat(order.unitPrice).toFixed(0)} {tc("euro")}
                    </p>
                  </div>
                  <p className="text-sm font-medium">{parseFloat(order.total).toFixed(0)} {tc("euro")}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="mt-6 space-y-3">
          <div className="flex justify-between py-3 border-b th-border">
            <span className="text-sm font-semibold">{t("totalToPay")}:</span>
            <span className="text-lg font-bold text-navy">{parseFloat(data.totalToPay).toFixed(0)} {tc("euro")}</span>
          </div>
          <div className="flex justify-between py-3 border-b th-border">
            <span className="text-sm font-semibold">{t("received")}:</span>
            <span className="text-lg font-bold text-success">{parseFloat(data.totalPaid).toFixed(0)} {tc("euro")}</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-sm font-semibold">{t("balance")}:</span>
            <span className={`text-lg font-bold ${balanceNum >= 0 ? "text-success" : "text-error"}`}>
              {balanceNum >= 0 ? "+" : ""}{parseFloat(data.balance).toFixed(0)} {tc("euro")}
            </span>
          </div>
        </div>
      </Card>

      {/* Payment history */}
      {data.payments.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-navy" />
            <CardTitle className="mb-0">{t("received")}</CardTitle>
          </div>
          <div className="space-y-3">
            {data.payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between py-3 px-3 rounded-lg th-bg">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 th-text-2" />
                  <div>
                    <p className="text-sm font-medium">{parseFloat(payment.amount).toFixed(0)} {payment.currency}</p>
                    {payment.reference && (
                      <p className="text-xs th-text-2">{payment.reference}</p>
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
        </Card>
      )}
    </div>
  );
}
