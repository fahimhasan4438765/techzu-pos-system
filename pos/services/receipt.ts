import { Alert, Share } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { LocalOrder } from './database';

export interface ReceiptData {
  orderId: number;
  orderData: LocalOrder;
  cashierName: string;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
}

class ReceiptService {
  private storeName = 'TechzuPOS Store';
  private storeAddress = '123 Business Street, City, State 12345';
  private storePhone = '(555) 123-4567';

  private formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  generateReceiptText(receiptData: ReceiptData): string {
    const { orderId, orderData, cashierName } = receiptData;
    
    let receipt = '';
    receipt += '================================\n';
    receipt += `       ${this.storeName}\n`;
    receipt += '================================\n';
    receipt += `${this.storeAddress}\n`;
    receipt += `Phone: ${this.storePhone}\n`;
    receipt += '================================\n';
    receipt += '\n';
    receipt += `Order #: ${orderId}\n`;
    receipt += `Date: ${this.formatDate(orderData.createdAt)}\n`;
    receipt += `Cashier: ${cashierName}\n`;
    receipt += `Payment: ${orderData.paymentMethod}\n`;
    receipt += '\n';
    receipt += '================================\n';
    receipt += 'ITEMS\n';
    receipt += '================================\n';
    
    orderData.items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      receipt += `${item.productName}\n`;
      receipt += `  ${this.formatCurrency(item.price)} x ${item.quantity} = ${this.formatCurrency(itemTotal)}\n`;
      receipt += '\n';
    });
    
    receipt += '================================\n';
    receipt += `Subtotal:    ${this.formatCurrency(orderData.total - orderData.tax)}\n`;
    receipt += `Tax:         ${this.formatCurrency(orderData.tax)}\n`;
    receipt += '--------------------------------\n';
    receipt += `TOTAL:       ${this.formatCurrency(orderData.total)}\n`;
    receipt += '================================\n';
    receipt += '\n';
    receipt += 'Thank you for your business!\n';
    receipt += '\n';
    receipt += `Status: ${orderData.status}\n`;
    receipt += orderData.synced ? 'Synced with server\n' : 'Local order - will sync\n';
    receipt += '================================\n';
    
    return receipt;
  }

  generateReceiptHTML(receiptData: ReceiptData): string {
    const { orderId, orderData, cashierName } = receiptData;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Receipt</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              max-width: 300px;
              margin: 0 auto;
              padding: 20px;
              background: white;
              color: black;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .store-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .store-info {
              font-size: 12px;
              line-height: 1.4;
            }
            .order-info {
              margin: 15px 0;
              border-bottom: 1px solid #000;
              padding-bottom: 10px;
            }
            .order-info div {
              margin: 5px 0;
            }
            .items {
              margin: 15px 0;
            }
            .item {
              margin: 10px 0;
              border-bottom: 1px dotted #999;
              padding-bottom: 8px;
            }
            .item-name {
              font-weight: bold;
              margin-bottom: 3px;
            }
            .item-details {
              font-size: 12px;
              color: #666;
            }
            .totals {
              border-top: 2px solid #000;
              padding-top: 10px;
              margin-top: 15px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
            }
            .grand-total {
              font-weight: bold;
              font-size: 16px;
              border-top: 1px solid #000;
              padding-top: 5px;
              margin-top: 10px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              border-top: 1px solid #000;
              padding-top: 10px;
              font-size: 12px;
            }
            .status {
              margin-top: 15px;
              font-size: 10px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="store-name">${this.storeName}</div>
            <div class="store-info">
              ${this.storeAddress}<br>
              Phone: ${this.storePhone}
            </div>
          </div>
          
          <div class="order-info">
            <div><strong>Order #:</strong> ${orderId}</div>
            <div><strong>Date:</strong> ${this.formatDate(orderData.createdAt)}</div>
            <div><strong>Cashier:</strong> ${cashierName}</div>
            <div><strong>Payment:</strong> ${orderData.paymentMethod}</div>
          </div>
          
          <div class="items">
            <div style="font-weight: bold; margin-bottom: 10px;">ITEMS</div>
            ${orderData.items.map(item => `
              <div class="item">
                <div class="item-name">${item.productName}</div>
                <div class="item-details">
                  ${this.formatCurrency(item.price)} × ${item.quantity} = ${this.formatCurrency(item.price * item.quantity)}
                </div>
              </div>
            `).join('')}
          </div>
          
          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${this.formatCurrency(orderData.total - orderData.tax)}</span>
            </div>
            <div class="total-row">
              <span>Tax:</span>
              <span>${this.formatCurrency(orderData.tax)}</span>
            </div>
            <div class="total-row grand-total">
              <span>TOTAL:</span>
              <span>${this.formatCurrency(orderData.total)}</span>
            </div>
          </div>
          
          <div class="footer">
            <div>Thank you for your business!</div>
            <div class="status">
              Status: ${orderData.status}<br>
              ${orderData.synced ? 'Synced with server' : 'Local order - will sync'}
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async printReceipt(receiptData: ReceiptData): Promise<void> {
    try {
      const htmlContent = this.generateReceiptHTML(receiptData);
      
      // Try to print directly - expo-print will handle availability
      try {
        await Print.printAsync({
          html: htmlContent,
        });
      } catch (printError) {
        // Fallback to sharing if printing fails
        Alert.alert(
          'Printing Not Available',
          'Would you like to share the receipt instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Share', onPress: () => this.shareReceipt(receiptData) }
          ]
        );
      }
    } catch (error) {
      console.error('Print receipt error:', error);
      Alert.alert('Print Error', 'Failed to print receipt. Would you like to share it instead?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: () => this.shareReceipt(receiptData) }
      ]);
    }
  }

  async shareReceipt(receiptData: ReceiptData): Promise<void> {
    try {
      const receiptText = this.generateReceiptText(receiptData);
      
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        // Create PDF and share
        const htmlContent = this.generateReceiptHTML(receiptData);
        const { uri } = await Print.printToFileAsync({
          html: htmlContent,
          base64: false,
        });
        
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Receipt #${receiptData.orderId}`,
        });
      } else {
        // Fallback to text sharing
        await Share.share({
          message: receiptText,
          title: `Receipt #${receiptData.orderId}`,
        });
      }
    } catch (error) {
      console.error('Share receipt error:', error);
      Alert.alert('Share Error', 'Failed to share receipt');
    }
  }

  async emailReceipt(receiptData: ReceiptData, emailAddress: string): Promise<void> {
    try {
      const receiptText = this.generateReceiptText(receiptData);
      const subject = `Receipt #${receiptData.orderId} - ${this.storeName}`;
      
      // Create PDF
      const htmlContent = this.generateReceiptHTML(receiptData);
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });
      
      // Share with email intent
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: subject,
      });
    } catch (error) {
      console.error('Email receipt error:', error);
      Alert.alert('Email Error', 'Failed to email receipt');
    }
  }

  showReceiptOptions(receiptData: ReceiptData): void {
    Alert.alert(
      'Receipt Options',
      'How would you like to handle the receipt?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Print', onPress: () => this.printReceipt(receiptData) },
        { text: 'Share', onPress: () => this.shareReceipt(receiptData) },
        {
          text: 'Email',
          onPress: () => {
            Alert.prompt(
              'Email Receipt',
              'Enter email address:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Send',
                  onPress: (email?: string) => {
                    if (email && email.includes('@')) {
                      this.emailReceipt(receiptData, email);
                    } else {
                      Alert.alert('Invalid Email', 'Please enter a valid email address');
                    }
                  }
                }
              ],
              'plain-text',
              '',
              'email-address'
            );
          }
        }
      ]
    );
  }

  // Quick print for common use case
  async quickPrint(orderId: number, orderData: LocalOrder, cashierName: string): Promise<void> {
    const receiptData: ReceiptData = {
      orderId,
      orderData,
      cashierName,
      storeName: this.storeName,
      storeAddress: this.storeAddress,
      storePhone: this.storePhone,
    };

    await this.printReceipt(receiptData);
  }

  // Quick share for common use case
  async quickShare(orderId: number, orderData: LocalOrder, cashierName: string): Promise<void> {
    const receiptData: ReceiptData = {
      orderId,
      orderData,
      cashierName,
      storeName: this.storeName,
      storeAddress: this.storeAddress,
      storePhone: this.storePhone,
    };

    await this.shareReceipt(receiptData);
  }
}

export const receiptService = new ReceiptService();