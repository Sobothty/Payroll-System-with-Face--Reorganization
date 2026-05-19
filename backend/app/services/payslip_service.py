from pathlib import Path

from weasyprint import HTML

from app.models import Employee, PayrollDetail, PayrollRun, SystemSetting


OUTPUT_DIR = Path(__file__).resolve().parents[2] / "generated" / "payslips"


def generate_payslip_pdf(settings: SystemSetting, payroll_run: PayrollRun, detail: PayrollDetail, employee: Employee) -> str:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    file_path = OUTPUT_DIR / f"payslip-{payroll_run.id}-{employee.employee_code}.pdf"
    html = f"""
    <html>
      <body style="font-family: sans-serif; color: #111827; padding: 32px;">
        <h1 style="margin-bottom: 4px;">{settings.company_name}</h1>
        <p style="margin-top: 0;">Pay Statement</p>
        <hr />
        <h2>{employee.full_name} ({employee.employee_code})</h2>
        <p>{employee.department} · {employee.position}</p>
        <p>Period: {payroll_run.period_start} to {payroll_run.period_end}</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
          <tr><th align="left">Earnings</th><th align="right">Amount</th></tr>
          <tr><td>Base / Gross</td><td align="right">${float(detail.gross_pay):,.2f}</td></tr>
          <tr><td>Bonus</td><td align="right">${float(detail.bonus):,.2f}</td></tr>
          <tr><td>Allowance</td><td align="right">${float(detail.allowance):,.2f}</td></tr>
        </table>
        <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
          <tr><th align="left">Deductions</th><th align="right">Amount</th></tr>
          <tr><td>Tax</td><td align="right">${float(detail.tax_deduction):,.2f}</td></tr>
          <tr><td>Insurance</td><td align="right">${float(detail.insurance_deduction):,.2f}</td></tr>
          <tr><td>Pension</td><td align="right">${float(detail.pension_deduction):,.2f}</td></tr>
          <tr><td>Loans</td><td align="right">${float(detail.loan_deduction):,.2f}</td></tr>
        </table>
        <div style="margin-top: 28px; padding: 18px; border: 1px solid #0f172a;">
          <strong>Net Pay: ${float(detail.net_pay):,.2f}</strong>
        </div>
        <p style="margin-top: 32px;">Generated on behalf of {settings.company_name}</p>
        <p>Signature: ____________________</p>
      </body>
    </html>
    """
    HTML(string=html).write_pdf(file_path)
    return str(file_path)
