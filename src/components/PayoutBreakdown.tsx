import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPayoutBreakdown } from '@/lib/payouts';

interface PayoutBreakdownProps {
  totalAmount: number;
  showDetails?: boolean;
}

export function PayoutBreakdown({ totalAmount, showDetails = false }: PayoutBreakdownProps) {
  const breakdown = getPayoutBreakdown(totalAmount);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Card className="bg-gray-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-700">
          💰 Payout Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Total Sale:</span>
          <span className="font-medium">{formatCurrency(breakdown.totalAmount)}</span>
        </div>
        
        <div className="flex justify-between text-sm text-gray-600">
          <span>Platform Fee:</span>
          <span>{formatCurrency(breakdown.platformFee)}</span>
        </div>

        {showDetails && (
          <>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-sm">
                <span>Seller (Remaining):</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(breakdown.sellerAmount)}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span>Community Owner (10%):</span>
                <span className="font-medium text-blue-600">
                  {formatCurrency(breakdown.communityOwnerAmount)}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span>Platform Fee (Business):</span>
                <span className="font-medium text-purple-600">
                  {formatCurrency(breakdown.businessRevenue)}
                </span>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-between text-sm font-medium pt-2 border-t">
          <span>Net After Fees:</span>
          <span>{formatCurrency(breakdown.totalAmount - breakdown.platformFee)}</span>
        </div>

        {totalAmount < 50 ? (
          <Badge variant="outline" className="text-xs">
            $1 Flat Fee
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            $1 + 3% Fee
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
