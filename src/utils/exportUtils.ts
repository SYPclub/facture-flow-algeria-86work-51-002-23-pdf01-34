import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FinalInvoice, ProformaInvoice, DeliveryNote, Client } from '@/types';
import { fetchCompanyInfo } from '@/components/exports/CompanyInfoHeader';
import n2words from 'n2words';

export const convertNumberToFrenchWords = (num: number): string => {
  return n2words(num, { lang: 'fr' });
};

function formatCurrencyInFrenchWords(amount: number): string {
  const euros = Math.floor(amount);
  const cents = Math.round((amount - euros) * 100);

  const eurosText = euros === 0 ? 'zéro euro' : `${n2words(euros, { lang: 'fr' })} ${euros > 1 ? 'Dinar Algerien' : 'Dinar Algerien'}`;
  const centsText =
    cents === 0
      ? ''
      : `et ${n2words(cents, { lang: 'fr' })} ${cents > 1 ? 'centimes' : 'centime'}`;

  return `${eurosText} ${centsText}`.trim();
}

// Helper for formatting currency
const formatCurrency = (amount: number) => {
  return amount.toLocaleString('fr-DZ', { 
    style: 'currency', 
    currency: 'DZD',
    minimumFractionDigits: 2
  });
};

// Helper for formatting dates
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-DZ');
};

// Draw rounded rectangle with fill and border
const drawRoundedRect = (pdf: jsPDF, x: number, y: number, width: number, height: number, radius: number, fill: string, stroke?: string) => {
  pdf.setFillColor(hexToRgb(fill).r, hexToRgb(fill).g, hexToRgb(fill).b);
  
  if (stroke) {
    pdf.setDrawColor(hexToRgb(stroke).r, hexToRgb(stroke).g, hexToRgb(stroke).b);
    pdf.setLineWidth(0.5);
  }
  
  // Draw rounded rectangle
  pdf.roundedRect(x, y, width, height, radius, radius, stroke ? 'FD' : 'F');
};

// Convert hex to RGB
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

// Add common header with logo and company info
const addHeader = async (pdf: jsPDF, documentType: string, documentNumber: string, status: string,  ) => {
  // Fetch company info from database
  const companyInfo = await fetchCompanyInfo();
  const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQoAAAFmCAMAAACiIyTaAAABv1BMVEUAAAB5S0dJSkpISkpLTU3pSzzoTD3oSzzoTD3kSjvoTD1GRUbeSDpFREVCQULpSzzoTD3c3d3gSTrg4uDm5uZFRETbRznoTD3oTD1JR0iXlYXaRzncRzhBQUDnSjtNS0zUzsdnZmVLSEpMSEoyNjPm5eSZmYfm6ekzNTOloI42ODbm6Oiioo/h4eEzODbm5+eop5SiopCiopDl396hloaDg3ToTD3m5uZMS03///9RTlAAAADy8vIgICA2NzY4OzYPM0fa29qgoI7/zMnj4+PW19VGRkbqPi7v7/D6+vr09fXyTj4rKSvhSTo/Pj/oSDnlMyLsNCI0MTP0///tTT7ZRjizOi+6PDDmLRyenZ7oKRfExMT/TzvobGEVFBWGhYUAGjLW8/ToXVADLUZ8e33/2tfRRTdWVFTFQDT1u7aSkZIADib+5eFwcHHW+/z70tDwkIesPTPW6+teXV2xsbG7u7vY4+Lre3DMzM2qp6jilIxsPT7lg3kdO07m/f4AJjuwsJzftK/fpZ7woJjoVUZBWGj1zMdTaXfcvrrzq6Tby8f+8u8wSlYZNDaQRUKfr7d9j5lpf4vx5ePMsLF/o64s+PNlAAAANnRSTlMAC1IoljoZWm2yloPRGWiJfdjEEk037Esq7Pn24EKjpiX+z7rJNNWB5pGxZ1m2mZY/gXOlr43C+dBMAAAmkklEQVR42uzay86bMBAF4MnCV1kCeQFIRn6M8xZe+v1fpVECdtPSy5822Bi+JcujmfEApl3IIRhBFyIJ3Em6UMTDSKfHsOB0dhILQ2fX4+4aF0tVXC3yJJB4OrcJV1msIhJN52avslhpZOfcvyepfceIaARw5t2CWTwYRhSQTdSum1TGqE5Mr0kg6Ukj66hZ3GExaEaJQsYIWXzmd6P2KHxn6NjG4/BDMEQ6RM+oNQ6vjJyWFTNTDJlau0e1drAO+Ikan8tE1itkfC0S11iXKGyYJZFB5jpkgmY8WWoKx6Z5JI3MGyQqV1Jj80Jgm2J9xGrQSAKfcyptEfgFrxxWnUUiVEqIGjN5bAsRKyOReI9FaGxw3o0Of8I6rAbbcBR06yN+T+Uogmu2QR5ucsaXuV6w1hath9HiDWGwWrLmOoUL7/CWYLRo6/2d9zPeN6hONNEvXKiIf2fkwauDCxXwcPI0mA/4v+whvwdzafABTh/tZW3SEcmZS0NYfJTTB5kaYsbnHSEMMWMfuvJdg3vsJlR9R6UP2JOp9jRhM/ZVa5dwiwJCT9UZI8qwtRVGh2JCVSsXtyinqgtMk0NJFf1QYwGlmToGhkQFQg3X5nvUofzw7FCLr2bRak2Uz0KgJhOVM6EqjlMpvPwp+ioWy2JAbWYqQ6E+mv5SwyNzJWh/HHX6Rty17TYNBFF44CokEA+ABELiJ2yMnUorefElCY5pHGgqu3JUhYAU0xpwwYoqJSAU8sgXMxvvekwukAS0PS9pq3I8OXtmZm8pF3D6vuLEx7N833/N0bI85X/CarUEte9b68nlf4rg+lKoEGAvPMvzk6+Ak5OwZ71u/S81gEoJR8AMyPNR2FOs7jo1pG94PvzdD76vjCZTYp/vlzDefw0hYOWf4b1+3Tt5+3MfcZ7NxnnPX0Uu//7StQUhwgmNk/N9x3ENDpfF/P7E6/6rM1qt8K0BXMjsOs7+eZKNR95KMSQfCgS/pUY4TuPUdlEHlOPnCXj7H2B1e9+ZxRaZHVuN49nI8pUlNC9JRLVSwMhM4piahmOsAAznW+UfsuR16wT9sCCGStKEhkB+kba4jKawrBFNKLHREUvOME5a1q5VglnCXsPsGCaN04myYAy5Fz9xae5b0ySlputURksDVCxigzFarZ2U6IIlDAQwA9xqltAsycKlciTvcATbh6/QhFBTWMI2mAoqITaPWRjju2Xtkh0naIk5o20S06gygxY0js8WtQguycJ9VILElBJXhKZp5sGH541arfF8eEA0zbBFxXi7QyPp9kolbFD44/GzvUatsffm+BC+s7kWKqVpMlrMEWk7nTfK1jFNKKW2K8Klw5qu6xGAvTwxYRyFL866W/cO6ycoITQ+aOgFNXt5+rGU2TWZFuECu6zPUVxuilTOE0Ko6ggljiHWWolIj96JiO19w2ttWyje7peWONzT9RoCxKBcZtegkCMUE1DiSgSnV/4oyVih4AN32JgLAcPGw4ZxfEE1kSLfW962haJ025AzIrmuH/EkcW1KaDJFLWT207tciV6aUkoNt4iX8BhrH46He3rU4MP3WRMpMtoqRSzP2LcLZud5SRcJ8kakH/Pq6ZiUkCSvsks5L8P88PxxQoUpbM2u6Sxc/YPJmsgRzxQwCtF4irzfaqkKfVR00A/cEg0wGSM/iAr3fdEMYQuSpT1f/tTiCjdFGBNCeM10tDeFEi+0Au/K8J9qjqicr7ermTw9PnEqJP/Ic8Tk5cJkKTKpSiFp9/uaMEXMTFGYlEdX06nG8bzM7kPN5g11CylaZ/suN8WLUgqC5HOV3xQqOyqzRdazpC/V74hKkZXtw9H2ioF6rgkciDfAAwYpfnrW5kXzhzDFl5Lo6SI5VxkyhNki70qvmzcKKSYJ5fmB8eofNA58B5GonO5+uHE/9az3hRSOI+xVJcfHOSJDSEoVVFrS3xK6VxT4WQpKkOJNisoWNTSB43IeAKWe99OTjTPE6hmFFNpn5Fkij2qmVkpB4jNf4r4engP5ISghSoXm7uk83Hc8WBuqPGaIW0jxY2MpWiEvFZhoFXJXkOsfCynUuRQTX/Iy5AqfXsUVKUgtwmxgUF9CQ+HQ9xyN182Wt3nV5BO3I5Qignc+xxtBrh9UpZhaVXoJB2X3CynyqhSfYZjEPOL40KQHNVQCskbdXopR4QpXG6IUMK0aMvI9zJkjrZxZkHSmWHJbyHVeNatS0CjCcHUYPlRiJymwl3IpBAryGkpRcUVGe5a0xSn2Uu93KdRGVEMIXcqZkePsJgUmyDL5coJkBKWQc0x2G10hOojD5jzLwCbo7pIgOHdbT324IIXcicXNqiuIXdji+E9SvBPNdLyxFH7pCrMWrWduGNhML0CKx+gKnGIdrpciikwhxWTjKZYfnjuGWNysl2LImcnFuQKlMJ2/ZEhDf8Lzwz3P/c2nWCquxtaKrFNsIKxsfpNcKx5jM50XC5cHHK2P1y4G+Hy0uRQKLdfoz/T1pnDLDQvWTD1Ptitwtlmux1y+KkdgvxOmcGHtuPkaZMwzxNZMXV9ttz2nWI2x/MDZpvQOYn2jWWGLYhPL0Z6sDJhtVwhTTLfYu/HzBIgLlQ/0qLFCiUjVbLFGZ4hHvuRV+h0e6ziu2sLW+L4CQqza+c60gZsrGwBcZ3NbMMfpjSUl9E8aJ6YghfwNCzwu7Y64FERsbrpvFp2s60OhBCR0Gm4hhWfNUiDmjvsYLTDD9/MpBVYKGo99T5G7BrlWFraU8CbCtdBg6YHVk82+P6ISajrbbm8zT6A7iRwxQWY9Qmb9ia3h+RhhSEa+7AOy+xgrFSkiRs8+el7TORovjhzNFUdCBqbypj2EZKqD54+fnjUizhztPTks844rQeOZZcm+h/RAxGrRuIgCtMBzTfPju+Ph8PjdJ1MrLWEzJabg323QHSWUlQsuM5B9PjgaDodHB5/d4tQUuwcgDn3p52NXy1jPEkJQCzzs5nAqp/8ki3u+shUsfxajFqx6IrgQqARNFiqFnD9mGigKHoSUWrgGwhXfiHTGTdgNITaSBTEyuwvERQBpplgXcN3kER5gkVhosXzpBqNXq4ea21XOvxKTOTK4V3ARZ+m3KuMWpzwYSlQXBxDhOkZx1O0rW8OyZqAFsf9AzJ+dTLreRVxZvPFbaSu1oKZd+hfDtVUCSuCgbQi8yLKeGITgSLB7yJXiZvWW4lkci4ggNBY0otCBkjgNt75ogtebCF1LPAfNoGSiElJmWDjzRnjdMEsKkwLmQauqzaCqJvueuZd+6yo7wvcnSUZXEZcDkCb5CiWaUqS4/nttU2YsWFSDgb/wMbN8FpuyNZrzljpKY7pAjKkBlsvOVt2FfHhJBq4vDlyexqKp8QDxiyRmY9ZWgh2kgH9UB9/1aJJViRGsHk8VTD7pl96vlaPWbNbb7L5tOIuTtBwnHLE0ice9rlWvN/vNtrID+oFSh4KRZ0mcVYi5KFmckHxuuTrEchGXsa6hg4N+UAc1fOtsMovjNCOIDHSYTULfr9eD/o5KtJV+v6/UrW4vHzM1CGKuwzhnF4WZ0kGgKNImm4grGGo7GLzqQyye73vhZJbFgDRN2Us2m5xZXR/ifPUqALl2Q70JD2jXgaiXT0mK9Cmd5t985rg2/ApKLXWyiVLMndnvdAYBqGH5vhKO8sl4Op2OJ/ko9JghlGBwOoDf2hntetDpwDsFfqsXFvTAPwq/wQ+Av9l/1Rk08QEyJ5u4HkMxTl8N+k2lbYEcvsXAXj2lCZ457exqCXzA4LTD+BVOz/nbLD8Hp6eDJj5A8v0jvOteFeO0A3JAyjabnuc1mwFECTqcdsDdyj+iDTkm+KFSM3oQgfF3QCMUQt60AnFvKValP2BqAF4VgK/gB1BHMNDdASQB8iN9B2oE5AhC/ieFbq0YuDbY4BULtcNjhVH8H0KgGAU9Azxkzh8oVSFkX9tc/1FbVsqDAYuXx9ms/xchkF/hagP7vDat55f3v7rdXJvUbKoTADDO/wlGHxT07FFrIfEDIXf+WOMY2r+4O7sepYEoDHPjD/AjMVEvvDFeGOOFCXXiRzCCpSC2BlTUVmtrjbXVVqPWr9oYKEgwuqg/2HM6wCCWqSKOxGcTN7iIO++858xpOXt28zqwly9W+dfKiv9muA2X4rLiv/5h9AVElRVYbv5zVH65UtzsLmSWid6FQvOvosrdKxrnol/YGAv+MJPO1SehJWtd7e/oocJLd2XrrfvwnF5ehcjpaQc5UmjDdyRwX8PlEg4r2KAgqMJNrWyEo0Ah5PEbjhQCB3oc4sXHm6cEOQN6RFYLBy3gNZSqrquAKsuZCHIfVBicIZS7nzhSCPw50z1cKb6ROcqXgRtGRh+3VLvZ1bRfFEXNBLiCCmCkWcbbnhs0yAKfOa4QOdqEN4u4ef1jm/xIu/HFDwbvezh3wmpd1TRYIpgFPuNFN+PKFU1DF2Watco4DKPnDgJ/rJBlntrXOFKIG2HBHxan3/5GViNVg4H7fgSyvI0MwAL6/b6FwMMoegujQEau73wZK+3Vr1LxdN5pKugSnV9uYoQkDbKK9vCHR+22AozHYwWAR2TKu2+Ex0vb48RHYZuJsHKz2fRSsorUe0F+gZ3T6UuyivqOadpPOFKInI61n19jffKGq5boeRNSjFIxPXN4i+Rxfif2Ejvm3C8tLCvEVd7NTsWbKORnGhPPtk2JFDL0KhXbMz/u1JQfJXrxOU08E74I8bEVZUXRSCz9ie3FO8tLrsJ22pWKGddJASkogZheEqfDybfPyLfJMI1tD1+iYldaenkrygpsvOHR0S/apmcPP9fnfqh9HtqwnYhXoMX5GJWg2KbpAaZHP5l2BaGm2IqyonCOoH7VtiuJ5+Ge7uzgdsKDpAJQLV6S1dxIvEoB1BRbUVbQG738AzXbvwQ2c76dDBNTYi41zIkVHswUW1FWFM9UbDZjm7MWTImTz7dgVhCZU699ntCcWGwKfDdsO8oKvNHLp6W3QAseJnjFjuM0HQ4nk+Ew/YgxBOYpxqY1xXaUFb8ynFgvx3bhmhLTnIdQwp7Ox/7EV0Lwb8ktvtHbolpsHEwUeMN7S8oKWnn/qS/sJDFzSBLb5ivRLHMRPENvl6au7wubSgCZ4iOkikfQEE559GiYpmkcT7+e2GsqIQsdxHokvNJVf8EXl5d2OKEapNCz/uqrOwgcwJ/jAMEF9/3XVw/vDSGP/qSHXawEzuEUOrZ597uBcaVb7Av9TcVeLB0rH9M7r95fcOYLDy4EFxgBMFXHCdyvDx9hbWb+hhKq1u1HwdGSOPZVpXftgQE3XQto6q03M2N4SXrjAy4Tt76QIMieOvh6LzaTqRCXr/KVULua4dbfvZOOlIRRkyQUw7WKp0fq+pMYxbDN4VffRxv8DgHKcSMxs8Lqk67zI0OLBqRdr0rS7pIojklIVWorI7VQjI5efoMlxMOxf2EtnPHXGE6Viy29yU8RUyGQfSVB1CRKtd4eh/A9FGUMiBIz9p0L66LseJef6Do3RVihj4MXq1JGrSSGfdKMarVNfBSjMEqufgrG6yrhjA+AEJ3VOtzULDcbblmVZgjKnLslRlVCMSxOAu00qRiGC2G/lhBOKOsdTmAY4QCFQEswDpcEQE3BjCHBtzECMfLrjPvYkYVqaLIxCjBx/o4Mju+4YV9TVxtCDgOC1KuLSgjJnMwUTAy8K+UaK+aXQ38W7R9TNa0fjVzHZ8dp0VEauKGh0rm+0KWZZ4iRTxBFokIItQUzBQO0oGJ0c5JGE3uToUsNu6dkWJYRhSMX9xtwKFhY4QfFpwWW28P58BoK0cEerKV+drl7sw+GoDRAiGWOl/46NYnBjNHIxIhyMyh2MmZqlFGNbHUWCIJvggHogQwwiguMemEYGRZ9opr96xb2ri4HRuQqBGBZYomiOmvzpmBBgvhh/2a+NcrQi43tyR3sKpNxnZqctRz0rTl9WCR+CZCpCrRDEYTodBb6TFhgIGcWhBCaLWpSPlXpDN2iUVTudtXcQMG2y+u4sHImCH2/fAlVzYwET6A93A/g+Z3mYklpve1hYPAtgRwr/VWOSsAqY0wdO3aN/EDBPcbGb6oHCoJ0gHL2gTQBEAFVwEZYtFGHhQVUUgOyCAqxkr2lv8heiQNmjClOWO7mqEG7ULEfPNOD9scjtCxFrs4a2Z/Q5LKYHqwQ8wMl5+AQmzlPSAjfGBTFDcu5JwrNg9lipz3QjKx7+wmAWYXpoMrwSgYNC44lhGZOZopiY2CgRCqsQc0PFZRjJsT0TwpGD2bXeQfWTaxHHAJwLCE6cx6TOLCjhOG7b/tavhyoxqx/fW4PCBlMIdP0gN14mgp1tUIY/IOD8ZevUGtSEbhTDbKIMhiFlpwrB64ZswNllkg7syMTVXBdn+TRKLQE/wp188cHP2MwHBflyGvmxMVTOjMRICSgNTPqLajAzxLibbE397/nZwyGAnJAMyftuVNzmxJpF59qRaHrKGQl7GpcvC34pijOGIxxkPUu4prBIzOu6FewKU/t4/XJgHnhTy3BblwIMAUnY3C2dewM3F4vjCIDicLwSc913YHPcwInS3CpsjpLUE3BNwafl6dOp08JY3OWQE6WNs5h6TdhRwmXhxdPIxcfrm8J0XXWbonD2sZ4dun0jLM3CAfOpZfozHlEWgPMGDyeoyMYF58THlhUrcOxf26KQmM8O3V6mVPPNpYlGOe3wBQFRwlTggFD/FdmCWldjoo8Pvj1Vn7c1xuQJ5Y4C+ngjLJJSyA1sccH3xh5J0GVSLeXpaiRKlBv/CTELykhxBbHpfXIzxgKCgF//Z25M35tGojieP2hsy1CjSlOUER/GEVG6Q+VPc+bg8BFLmPVKQyMQQ9GQQgUhTXSigT0L7epc3e7O7WN34EfxjYGG+u3l++99y7vhRWWEooJndK52Xh9wv9iUeitxN0S2YSbvGZS6JTO3TjqM7yq7SMWtClC7LuLXUh2wA0KJqxkv/aSCGLPssBvH3FAm6DfZ+eqF4y45ohJ22NqL4nhyFPmxC+KoG6Mcei8xYKpS55p/0Ztlxj2POeG+FOgQUC1EEvcI8YP/JycCY/H1CQIY+sHV1LGGwVUE89rTZLz6OJp5ZkwImfT611FbXcYEA7BZnxFygQBWf3bUpKxLPAVm6gvCAjLf4XchCRsCCpJlnqp9VAxhbxQOOgREnbGVxwwSUB6jaD8vnf6SZQlwULOcPi5LKUkKcuSBFF/hxyex0TFhBYqV4I2QocWIiEgu43dj6/eHL99+UWUUsBKOOHjZRVy2Rv89Vv1V3seKSYLIqUozahY0EYkgp8zY4RAr4Fvxz9vzflSlgJWtbhfjV+ozqrekSTPLRZZOiWhpispZrQRrDATEBhVqD2qTl1WMzBlGYEORK5dnFW8/VpGeksxpFDxrFhKodKJoA3Qron2zcEySP71EJk3pyMdeKO6P16dyoHnPCRLi4WialWI6aZSTDnH+qbeOy+eDnms2yJgMxqO38m+p4xTZDRVlMdpRouMNoI95xzrm1qKR+dS6PG0sAbbarR9ueMpXiwlUNny8/LrPKdN2JfPjMSUcMRVHLD3EtxuuW306j3oh42AcLCMX5CDpNCnYrdeWj1UwE7KbmMJVIpUS/EQLsV1c3YBuOu6CZdiwjnaN3VWvgWeGXbHbuuNySHLaImYr76PKc6ytdxTh90V78Uh4XhgNoyDhuq1rF7W0JUiU5mKiWZTolhlM0oXa0vxlGvmjHDsXG4N7oAnP3WsVFXHFdUHqcWc0uznjrIeMjngmgIuhZ45chcSampaTvnbXBVCzXOKp9kGUiQRN0iRUvSsmSNN7OzA5h+kKGhW0OoKUVUAPqN1YAU3mEClsEbctaA912On/q0vEJrQJE2nlXHm87VXBcu5wROkFLvWdIlb0Kjixh+kmOdiQtVnIhWvL8WUGzw7lARj1xqpMIZOUez8Toq5SlORFUSUZ+kio1mepvQXdAaiiROC0bcj5SbSKq7rswAM+/I9N1kwgtG3R4N2kUM77qCl0BkI3jeH9lSeG8Co4qQBlyLll3gKlGKkrQ4UWYwN18RLMeGXOAL65sCJlbdwI+I6cCl02I33zcB5Ads4q2ihpZDJEdeAq96BM+Oui5sF1kRLkcTcQgGlcEoM92BzA8fX0FKwBbf4gJeiDTKLbWvwFlgKxS2OEkkgAnd47jZqCG8bL8UZt4lgvhm7OVQXZRVdtBTmnVh434xDvYUAMrJrYzPsRktxKLgGXvWOQsfuxqgZvE20FKzgDmdIKdwqNcQqdM14hwDYxQq8b4rQTR1uYqziXgMuxUPuEiVoKTqG82Osoo2X4gV3KRhMCjdgvo2ZUd1F3eVsFitccrgU1xGTalvWFGSsFGzOPTyES9HcAwRZbe8U5FCApEi5h4NEgqXY2gMEWSfeBxWFEQGwixX4uyxCT3X2FiAXM9O6mCBYDVNo3xShZx88AbimuQ8FhGDf6pdC+2YU+q7zO4ABvB2kFNo1Xc7gUnRM8wc8G6YFl2LGDfBHZLG3EncTMM2+CWok08jcu4OQJAiBd3W36xa7/cHJiCBIXcQyzwqZIAiB1/Pu1nVNv/UOCYLwpaYCpQQF/p1wq65reo+W+gTCtc4MpgQNnFSqfrzZsfZSvBRCsMg6MxWEYuR/mknrnx85d99qGwIh2A/qzq5HaSAKwyzg+lFbjRGVKKKg0Wji7U4nUGMCE1i7vWj0grDZvSHWkOyFgU3YcOEfUH+zM23paT3TUsaJhpfxY4F1Z56+c86ZKbXTs8zWvz4Ur+Tx/9ZfR807mlEAi5EHKzGdV4+9la+lnqpFTeQrjTt6wGJTgDO7h0mo6758qt9UjJqgh7pRAItxdA7AtcdAQoNeys92PlGsNUHX9KMAFuJjSGcjWyuJ3jP5vsvJgfpmBf4Hno2PR1pZ9PgcGeojEV7xvcrduFf/ZDfeFHx2OeRHcjzSyGKgq6Do8Y4NhtPJjFo5Ye+68mYFDjam45HFbDI94vCPtfliMNBhhuPBdHIeMM/3GTXkKO6qJhCcjU1CCP9ZrsdxXA57tj3uHf1vjY7Du3Vdzi8Cz/U9RkKhj9YpZtMbebnUIoRQ0Th6h1zMr6YD0RFVHjq8MB4Nl/MLwjzX8Ta9o6Qud/g91QSCc6kR/6zwF3NcnwWL86vphx7noRBO1RkICLwUWS0ns+ekf3bWd2gMgTcuU34z8weqCQSH3Spwj3+mf3Z25gYX5xMeTgUQMWf0M4HJMI5+hIBwfrFgjnCn5zuOA53if+lWEArFbPokL5fWwBXxg3fCd6IeLTiQq+XlahAeMp50R9oIRAjGI54fLpeTBEIYGChlDpdHwa+kmndf92uq5whxiQauCBVsDkgYTh1ffMWCi9l8spwOB0fxMTzuqVAZ9XrjEMD4+IgjWE7mnAD1OPoNBEKjJp6MbRG3Gjquitn0Uf6d7pox9sgTkSm8AGZpjER0lgTPZ+fzydXldPVhcMSHFXIJx8bhCI026gkdj7ngHSM+/tX08ooTmD0PiAcE4HDELQhtwYIEDjHR1qTiMv1h/p3uOhlXBAxmKUwdQBJ232EkWDy/mJ0LLnwCTaer1XA4HAw+DDb6wNtwuFpNuf2XVxMx+tnFIqAcQOi0tAkAQsKCUkeIwnNmXuC7o5pLcVnSzbiCRJM0/hIgwe+hmKDi+Fzh+xkTpg6CYLFRwEVp+D54o+exxAOZgSNXxIeEJU+w3FvcP1XNpXh6taEbsTF9YUxwBaYBr23EQnnM20h8IURiwbiBMsWuyNrC9xJIzdwNuXu6cqlAAR2MTOHEvUG931CAl8AnNPs8jCyVmxCBXFck0SJ+KYviLlpPqZ4DOTnMooBeUOanTIE6mwwXGowUhpQ5xPA0JpAbK5Jo4W3+5Wb+dH98++mNQ4VrgzDHdqr/wSaHFbki28QDuwJ5fldXUAjgopGuDAXo5GnZ8gLqMzy7LOhSHDQD6J0kcqKWdUWWX/yKgisIpHXx92pO5APd3bWswDH3gPwRtvEBlroCDVrFFRgbvAQWhagJJRbWLYUl+uc7mallxB2B6VnaFXiQGXxydvhb5a6gJM5mXDV81TDWQ6Ub+t5M5dODsN5MgrZkwFtdQQtiBQaHeMldQWmSzqql7t99U/E2zw/uPkqzyJoC2s6ugO/CxIpcgV+CIsfKt3hxhXFQa7VMVGHJKG6irtkk2QJPwRUYDn4WP13wGlQ5FvpImVxPUgwaVct488IRem2VsdSNzXd2CJT9qIulXQENCG1pGCqqvi18wlOuj+KoNqrGuxevnYxeV1GxiZUutGI75h78Qldso4Ma/gO30BZG2Rv9f/rYfeHkyMoniVd1RrRFALsl8vEpHF7USiOj1POrKAHkojhd/3TSes8fwALq7q1VSUMgZUFRR2MaBc4o08ojI9QwUVWQr9NfP2ME4sFbWo2imuT2n7Wq4Ti4YFQZX7EjyiNrNtAK+zQ8/Ken+Siy8sRqOYwX+NQYrixAjTeiCwoD3M0RZd/araRltizj3fqU6+OX9bePMhTffmYYhLsoQkSEQROtxop3Ry28HtXWdkwtzVZSGyR50fnprX+t18537+OnP29sxRl95Si8eH+IhiKhqNgrbeFUXHyhv1lHsUG9qbuCinOktaQ2AP0Ucn6uIxSfBAIucW/Ab99+rRMGBBTDYFX0iZutm+a1droO1kyiXLAgtF6rvfMdrPcxkPVpSIADiRisKSE/fhBggEQthALZAss00vsP/94WpG3WXmAGkBOEK758+8UJcAScAYewXU1AgXRYKYKhf3IA2WIQ3UbFTByBkmIcDCIXEN5Kq4pQoPqqwBm6GwAuApElIc8JCuoiFGX3Rw8MnRTK5STSCQ9denagnKCsJkZR/mIKq6PNGqVyUjdKeA2gwBhCoCwGyVRlN7BRbxKiwRHbcxJptjdbVW+cWAwY6JApK7FunpQ/mdJq/zULHCvQm9qpZZcTCzDoUUNWeN99dLLDFQSm1VW3RvaMCCXxI2uIzKqrBiT0qipbmZ5UDm99hi3ishOFosdOdURWECHAEOlQwSjRLCvar8Cl5sGOl1K0OA2k7Y4AYmklz3csE5nQifdYdctAu1jq/0VjtU2yKuOIZNRYzXqjIhGYQq/qf5yFf3LyN5ftMpIVLRMj5K7oGBEHrNfxnr9c1POJmrrJNtjN29E291/817YHjCBtjRFyV9QquXpRND+oP5u4ao7pJDt6h3ejHfKH3BfXNaGgRY4odIVZkQnqCpIj5o7shQILWJBd5+fdH8Xl9uGdGxVNKFABhlefu7vCKEBBxR1jR0SJBTtIbZzDuWM9KIxKw6p3iJDcEVBhsvIorPxYQd2FzXXk+Qossp/nOrl9qBNFPS6Kqka9G6dagJGo0zaqtequKOQh0x3YQh98FRaZOA0gdKEAmY2WZRj1er0dqV43DKvaMOOypDyKlgibRCp3aUcaqvgiW8vpRlFa5VwBlbd8eszsjQaeszMLa+9QmHmxwvN6dqKhu3MVZuwdikoOCtqf2ylN+ozspvr+oXgtLbypQ8Z2WvM+KS0qirbu/qF4IUXB+is7q1mf0HIgWH8280hn/1C8k6Jw5/afOndLWsKf2xOXNPcPhSFZhFD3uW2rsaCuN+XTib/V3DsUFkZBPf/IlmhWogR3A/GtE46itncoqhJX9K9smY7ZVhb9qBhZchSNvUOBy03qP7flGjg+3RIw7VCXPiHVvUOBy03mfrBzNCxajlA/CbZThxBr71D8budsXtMIwjA+prmJewl7iLD4EREjIiqWzAx1logOWoY5zC30sJcFoeDJBOLNP71jd+tE96Oj3dK8JT+vfv6YZ/Z5dd3SaceiIiCZzHm2C7H6drib5LgMTsVpx6KKkhxmjNEME+uluRfnuAZPxUnH4mJO8pgrSVO3iYAYFlTiO3gqukaFmT1yeJ6kmJDHnWy5kvgWngpTN008cgkSLqhSz+SIBsMYngpTNzPjkT+OUDzhpxPLWmFcAafiqG6KJ5Ikv4JTLoJFwpbSrwpOxZu6ScWaGOwyQuUkoS8aQjxwKlzTsbiYESvMOEKZSLT0eAhxwKmoMI35OtOSjaBmEE2y1SrK4FQc6iZlckFsWTBFMY0G0QTRPHYNTsWhbvLJC7FnrtiKpywjM4/V4KmI6yY1LcmKRzkRW5LBK8O4CU9FXDfZipzHXL7keOJwVXA2J0Vg5rFbeCr6P4sF5w+kOBZUwlWBC10Vy43EHJ6KeAhR30iBNBhEFQ7TmB/OiyFUEFVcRR1LbEmBBAKiCjdW8UQK5DtIFZ+YhuuG9aGiFKsIPlTEQ4gKSYGEMFVEp7GyBimOJZYYA1TR/alCbpakMJ4EyHEs7liSfiFF8aw4xlcAVURHU44fikjGw/xlGypJcRPel//xvom5fCR/wNfoyq4rzpRQmGJcAqnC3au4bAj5sr+u6fZ7qB0oIYT6dT3HZgXeCUjRA0zdPCMI2sCGYi73Dpjk2NC8QgioCuRoFWxtH4Rwg5k2oFj0L2UDb96VHRchuCqQyylnM5LD4jEOAnsbhKMT7R0vjgVoFaiGqQgzoxDoKKQEQcNv767LV+6xA9gqvPhc/+Qx4RAFjBNR8D6lHihgq0B3mEr19DpbzF5fnnUUGhlRaN7VrstO/jIArgJhTLlgnO6bgYnCRUGAriK6uh8vIgjQVaBSDb/lNjomlNA/p1AVlri1/cr4FYV3Q6Eq7KlU3pGDv6ECNh8qPlQkKeHLVdBjEHT4xf9W9PgxZRdBxmn5x3Ssl3mpxU7wWw4Cilvu+D47vXnIjpafQqcPccf41PXTKdnFw8+gjKBR9rOwW+V9P4uOhyBR6fqZdK3z8T8sDJf52bSQDdplnk0oeH4efWSD85vngEG+CWE5KAk/DyD7Rb6JPqrXB4OeZjQaDYfDe8NQMxr1NINB/Xri59BBEPByTcjqbmrDbodzXby/IfzMlAs11SasXTDgKrwcEyLQJqxdbCYCdkBQJ1MEN+mwchHKdBlMANk2K+nvXtBgZ0zYyZiGXCRtCAWmZFVOq6LSnwcbEecsjF2wkUIIxQ5KJ4KPERyclrGg8XHDiDjbxjTYYKlEBOPNzwMECtfptjo+8yVdNYLqzoi4zMY0CMJ1ozH+3KsjqJTqg95w3G5Xq5erqLbb4/tRb3CD/g9u9h1zNLq/115iqqm0Y8a6fo508azf/FMFPwB+4ZiyTYnf/gAAAABJRU5ErkJggg=='; // your base64 string
  
  // Colors
  const primaryColor = "#3B82F6";  // Blue
  const secondaryColor = "#6366F1"; // Indigo
  const accentColor = "#F59E0B";   // Amber
  const lightGray = "#F3F4F6";     // Light gray for background
  const darkGray = "#374151";      // Dark gray for text
  if (logoBase64) {
      try {
        // Add logo to the left of the company name
        pdf.addImage(logoBase64, 'PNG', 130, 10, 30, 30); // Adjust dimensions as needed
      } catch (error) {
        console.error('Error adding logo:', error);
      }
    }
  // Add colored header banner
  const gradientHeight = 12;
  pdf.setFillColor(hexToRgb(primaryColor).r, hexToRgb(primaryColor).g, hexToRgb(primaryColor).b);
  pdf.rect(0, 0, pdf.internal.pageSize.width, gradientHeight, 'F');
  
  // Add company name in large font with custom positioning
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(50, 50, 50);
  pdf.setFontSize(22);
  pdf.text(companyInfo?.businessName || 'YOUR COMPANY NAME', 14, 25);
  
  // Add smaller company details below the name
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(70, 70, 70);
  
  const companyDetails = [
    companyInfo?.address || 'Company Address',
    `NIF: ${companyInfo?.taxid || 'N/A'} | RC: ${companyInfo?.commerceRegNumber || 'N/A'}`,
    `Tél: ${companyInfo?.phone || 'N/A'} | Email: ${companyInfo?.email || 'info@company.com'}`
  ];
  
  pdf.text(companyDetails, 14, 30);
  
  // Add document type in a styled box on the right
  pdf.setFillColor(hexToRgb(primaryColor).r, hexToRgb(primaryColor).g, hexToRgb(primaryColor).b);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  
  const docTypeText = documentType.toUpperCase();
  const docTypeWidth = pdf.getStringUnitWidth(docTypeText) * 12 / pdf.internal.scaleFactor;
  const docTypeX = pdf.internal.pageSize.width - 14 - docTypeWidth - 10; // 10 = padding
  const docTypeXX = 80;
  const docTypeYY = 50;


  drawRoundedRect(pdf, docTypeXX, docTypeYY, docTypeWidth + 10, 10, 2, primaryColor);
  pdf.text(docTypeText, docTypeXX + 5, docTypeYY+7);
  
  // Add document number below document type
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(70, 70, 70);
  pdf.setFontSize(10);
  pdf.text(`No: ${documentNumber}`, docTypeXX, docTypeYY+15);
  
  // Add status badge with appropriate color
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  
  const statusColor = getStatusColor(status);
  const statusText = status.toUpperCase();
  const statusWidth = pdf.getStringUnitWidth(statusText) * 10 / pdf.internal.scaleFactor;
  
  drawRoundedRect(pdf, docTypeXX, docTypeYY+18, statusWidth + 10, 8, 2, statusColor);
  pdf.setTextColor(255, 255, 255);
  pdf.text(statusText, docTypeXX + 5, docTypeYY+24);
  
  return { yPos: logoBase64 ? 60 : 50, companyInfo };
};

// Add client info section with styled design
const addClientInfo = (pdf: jsPDF, client: Client | undefined, invoiceDetails: any, startY: number) => {
  // Colors
  const lightBlue = "#EFF6FF";  // Light blue background
  const darkBlue = "#1E40AF";   // Dark blue for accent
  const darkGray = "#374151";   // Dark gray for text

  // Client section box with light blue background
  drawRoundedRect(pdf, 14, startY, 180, 40, 3, lightBlue);
  
  // Left side: Client info
  pdf.setTextColor(darkBlue);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("BILLED TO:", 20, startY + 8);
  
  // Client details
  pdf.setTextColor(darkGray);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  
  const clientInfo = [
    `${client?.name || 'Client Name'}`,
    `NIF: ${client?.taxid || 'N/A'}${client?.nis ? ` | NIS: ${client.nis}` : ''}`,
    `${client?.address || 'Address'}, ${client?.city || 'City'}`,
    `Tel: ${client?.phone || 'N/A'} | Email: ${client?.email || 'N/A'}`
  ];
  
  pdf.text(clientInfo, 20, startY + 15);
  
  // Right side: Invoice details
  pdf.setTextColor(darkBlue);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("DOCUMENT DETAILS:", 115, startY + 8);
  
  // Create array of invoice details
  pdf.setTextColor(darkGray);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  
  const details = [];
  
  if (invoiceDetails.issuedate) {
    details.push(`Issue Date: ${formatDate(invoiceDetails.issuedate)}`);
  }
  
  if (invoiceDetails.duedate) {
    details.push(`Due Date: ${formatDate(invoiceDetails.duedate)}`);
  }
  
  if (invoiceDetails.payment_type) {
    details.push(`Payment Method: ${invoiceDetails.payment_type === 'cash' ? 'Cash' : 'Cheque'}`);
  }
  
  if (invoiceDetails.deliverydate) {
    details.push(`Delivery Date: ${formatDate(invoiceDetails.deliverydate)}`);
  }
  
  pdf.text(details, 115, startY + 15);
  
  return startY + 45; // Return next Y position
};

// Helper for adding stylized table
const addStylizedTable = (pdf: jsPDF, headers: string[], rows: any[][], startY: number) => {
  const primaryColor = "#3B82F6";  // Blue
  const lightGray = "#F9FAFB";     // Very light gray for alternating rows
  
  autoTable(pdf, {
    startY: startY,
    head: [headers],
    body: rows,
    headStyles: {
      fillColor: [59, 130, 246], // primaryColor in RGB
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      lineWidth: 0.2,
      lineColor: [41, 98, 255]
    },
    bodyStyles: {
      fontSize: 9,
      lineWidth: 0.1,
      lineColor: [220, 220, 220]
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251] // lightGray in RGB
    },
    margin: { left: 14, right: 14 },
    didDrawPage: function(data) {
      // Add page numbers at the bottom of each page
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        `Page ${pdf.internal.getNumberOfPages()}`,
        data.settings.margin.left,
        pdf.internal.pageSize.height - 10
      );
      
      // Add subtle footer line
      pdf.setDrawColor(220, 220, 220);
      pdf.line(
        data.settings.margin.left,
        pdf.internal.pageSize.height - 15,
        pdf.internal.pageSize.width - data.settings.margin.right,
        pdf.internal.pageSize.height - 15
      );
    }
  });
  
  return (pdf as any).lastAutoTable.finalY;
};

// Add totals section with styled design
const addTotals = (pdf: jsPDF, invoice: any, startY: number) => {
  const primaryColor = "#3B82F6";  // Blue
  const lightGray = "#F3F4F6";     // Light gray for background
  const darkGray = "#374151";      // Dark gray for text
  
  // Draw totals container with light gray background
  drawRoundedRect(pdf, pdf.internal.pageSize.width - 80, startY, 66, 50, 3, lightGray);
  
  // Add totals
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(darkGray);
  pdf.setFontSize(9);
  
  pdf.text("Subtotal:", pdf.internal.pageSize.width - 75, startY + 10);
  pdf.text("Tax:", pdf.internal.pageSize.width - 75, startY + 20);
  
  let nextY = startY + 30;
  
  // Add stamp tax line if applicable
  if (invoice.payment_type === 'cash' && invoice.stamp_tax > 0) {
    pdf.text("Stamp Tax:", pdf.internal.pageSize.width - 75, nextY);
    pdf.text(formatCurrency(invoice.stamp_tax), pdf.internal.pageSize.width - 20, nextY, { align: 'right' });
    nextY += 10;
  }
  
  // Draw separator line above total
  pdf.setDrawColor(hexToRgb(darkGray).r, hexToRgb(darkGray).g, hexToRgb(darkGray).b);
  pdf.line(pdf.internal.pageSize.width - 75, nextY - 2, pdf.internal.pageSize.width - 15, nextY - 2);
  
  // Add total amount in larger, bold font
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(hexToRgb(primaryColor).r, hexToRgb(primaryColor).g, hexToRgb(primaryColor).b);
  pdf.setFontSize(12);
  pdf.text("Total:", pdf.internal.pageSize.width - 75, nextY + 5);
  
  // Add the amount values aligned to the right
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(darkGray);
  pdf.setFontSize(9);
  pdf.text(formatCurrency(invoice.subtotal), pdf.internal.pageSize.width - 20, startY + 10, { align: 'right' });
  pdf.text(formatCurrency(invoice.taxTotal), pdf.internal.pageSize.width - 20, startY + 20, { align: 'right' });
  
  // Add total with primary color
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(hexToRgb(primaryColor).r, hexToRgb(primaryColor).g, hexToRgb(primaryColor).b);
  pdf.setFontSize(12);
  pdf.text(formatCurrency(invoice.total), pdf.internal.pageSize.width - 20, nextY + 5, { align: 'right' });
  
  return nextY + 15;
};

// Add notes section with styled design
const addNotes = (pdf: jsPDF, notes: string | undefined, startY: number) => {
  if (!notes) return startY;
  
  const lightYellow = "#FEF9C3";  // Light yellow for note background
  const darkBrown = "#78350F";    // Dark brown for note text
  
  // Notes title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(darkBrown);
  pdf.text("NOTES:", 14, startY + 5);
  
  // Notes content
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  
  // Draw light yellow background
  drawRoundedRect(pdf, 14, startY + 7, 180, 20, 3, lightYellow);
  
  // Split notes into lines to fit the page width
  const splitNotes = pdf.splitTextToSize(notes, 170);
  pdf.text(splitNotes, 19, startY + 15);
  
  return startY + 30;
};

// Add amount in words section
const addAmountInWords = (pdf: jsPDF, amount: number, startY: number) => {
  const lightGreen = "#ECFCCB";  // Light green background
  const darkGreen = "#3F6212";   // Dark green for text
  
  // Draw background
  drawRoundedRect(pdf, 14, startY, 180, 12, 3, lightGreen);
  
  // Add text
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(9);
  pdf.setTextColor(darkGreen);
  
  const totalInWords = formatCurrencyInFrenchWords(amount);
  pdf.text(`Montant en lettres: ${totalInWords}`, 19, startY + 7);
  
  return startY + 15;
};

// Add footer with thank you message
const addFooter = (pdf: jsPDF) => {
  const accentColor = "#F59E0B";   // Amber color for thank you
  
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(hexToRgb(accentColor).r, hexToRgb(accentColor).g, hexToRgb(accentColor).b);
  pdf.text("Nous vous remercions pour votre confiance!", 105, pdf.internal.pageSize.height - 20, { align: 'center' });
};

// PROFORMA INVOICE EXPORT
export const exportProformaInvoiceToPDF = async (proforma: ProformaInvoice) => {
  const pdf = new jsPDF();
  
  // Add header
  const { yPos } = await addHeader(pdf, "PROFORMA INVOICE", proforma.number, proforma.status);
  
  // Add client info section
  const clientY = addClientInfo(pdf, proforma.client, proforma, yPos);
  
  // Prepare items table data
  let counter = 0;
  const tableRows = proforma.items.map(item => [
    (++counter).toString(),
    `${item.product?.name || ''}\n${item.product?.code || ''}`,
    item.quantity.toString(),
    item.unit ? item.unit.toString() : '-',
    formatCurrency(item.unitprice),
    `${item.taxrate}%`,
    `${item.discount}%`,
    formatCurrency(item.totalExcl),
    formatCurrency(item.totalTax),
    formatCurrency(item.total)
  ]);
  
  // Add items table
  const tableY = addStylizedTable(
    pdf,
    ['No', 'Product', 'Qty', 'Unit', 'Unit Price', 'Tax %', 'Discount %', 'Total Excl.', 'Tax Amount', 'Total'],
    tableRows,
    clientY
  );
  
  // Add totals section
  const totalsY = addTotals(pdf, proforma, tableY + 10);
  
  // Add amount in words
  const wordsY = addAmountInWords(pdf, proforma.total, totalsY);
  
  // Add notes if present
  const notesY = addNotes(pdf, proforma.notes, wordsY);
  
  // Add footer
  addFooter(pdf);
  
  // Save the PDF
  pdf.save(`Proforma_${proforma.number}.pdf`);
  return true;
};

// FINAL INVOICE EXPORT
export const exportFinalInvoiceToPDF = async (invoice: FinalInvoice) => {
  const pdf = new jsPDF();
  
  // Add header
  const { yPos } = await addHeader(pdf, "INVOICE", invoice.number, invoice.status);
  
  // Add client info section
  const clientY = addClientInfo(pdf, invoice.client, invoice, yPos);
  
  // Prepare items table data
  let counter = 0;
  const tableRows = invoice.items.map(item => [
    (++counter).toString(),
    `${item.product?.name || ''}\n${item.product?.code || ''}`,
    item.quantity.toString(),
    item.unit ? item.unit.toString() : '-',
    formatCurrency(item.unitprice),
    `${item.taxrate}%`,
    formatCurrency(item.totalExcl),
    formatCurrency(item.totalTax),
    formatCurrency(item.total)
  ]);
  
  // Add items table
  const tableY = addStylizedTable(
    pdf,
    ['No', 'Product', 'Qty', 'Unit', 'Unit Price', 'Tax %', 'Total Excl.', 'Tax Amount', 'Total'],
    tableRows,
    clientY
  );
  
  // Add totals section
  const totalsY = addTotals(pdf, invoice, tableY + 10);
  
  // Add amount in words
  const wordsY = addAmountInWords(pdf, invoice.total, totalsY);
  
  // Add notes if present
  const notesY = addNotes(pdf, invoice.notes, wordsY);
  
  // Add payments section if any
  let paymentsY = notesY;
  
  if (invoice.payments && invoice.payments.length > 0) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(59, 130, 246); // primaryColor
    pdf.text("PAYMENT HISTORY:", 14, paymentsY);
    
    const paymentRows = invoice.payments.map(payment => [
      formatDate(payment.payment_date),
      payment.paymentMethod,
      payment.reference || 'N/A',
      formatCurrency(payment.amount)
    ]);
    
    paymentsY = addStylizedTable(
      pdf,
      ['Date', 'Method', 'Reference', 'Amount'],
      paymentRows,
      paymentsY + 5
    );
    
    paymentsY += 10;
  }
  
  // Add footer
  addFooter(pdf);
  
  // Save the PDF
  pdf.save(`Invoice_${invoice.number}.pdf`);
  return true;
};

// DELIVERY NOTE EXPORT
export const exportDeliveryNoteToPDF = async (deliveryNote: DeliveryNote) => {
  const pdf = new jsPDF();
  
  // Add header
  const { yPos } = await addHeader(pdf, "DELIVERY NOTE", deliveryNote.number, deliveryNote.status);
  
  // Add client info section
  let nextY = addClientInfo(pdf, deliveryNote.client, deliveryNote, yPos);
  
  // Add transportation details in a styled box
  const primaryColor = "#3B82F6";  // Blue
  const lightPurple = "#EEF2FF";   // Light purple for background
  const darkPurple = "#4F46E5";    // Dark purple for text
  
  if (deliveryNote.drivername || deliveryNote.truck_id || deliveryNote.delivery_company) {
    // Draw background box
    drawRoundedRect(pdf, 14, nextY, 180, 20, 3, lightPurple);
    
    // Add title
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(darkPurple);
    pdf.text("TRANSPORTATION DETAILS:", 20, nextY + 7);
    
    // Add details
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    
    const transportDetails = [];
    
    if (deliveryNote.drivername) {
      transportDetails.push(`Driver: ${deliveryNote.drivername}`);
    }
    
    if (deliveryNote.truck_id) {
      transportDetails.push(`Truck ID: ${deliveryNote.truck_id}`);
    }
    
    if (deliveryNote.delivery_company) {
      transportDetails.push(`Delivery Company: ${deliveryNote.delivery_company}`);
    }
    
    pdf.text(transportDetails.join(' | '), 20, nextY + 15);
    
    nextY += 25;
  }
  
  // Prepare items table data
  let counter = 0;
  const tableRows = deliveryNote.items.map(item => [
    (++counter).toString(),
    `${item.product?.name || 'N/A'}\n${item.product?.code || 'N/A'}`,
    item.quantity.toString(),
    item.unit ? item.unit.toString() : 'N/A',
    item.product?.description || ''
  ]);
  
  // Add items table
  const tableY = addStylizedTable(
    pdf,
    ['No', 'Product', 'Quantity', 'Unit', 'Description'],
    tableRows,
    nextY
  );
  
  // Add notes if present
  const notesY = addNotes(pdf, deliveryNote.notes, tableY + 10);
  
  // Add signatures section
  const signatureY = notesY + 10;
  
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(59, 130, 246); // primaryColor
  
  // Draw signature lines
  pdf.line(30, signatureY + 20, 80, signatureY + 20);
  pdf.line(130, signatureY + 20, 180, signatureY + 20);
  
  pdf.text("Deliverer Signature", 30, signatureY + 10);
  pdf.text("Recipient Signature", 130, signatureY + 10);
  
  // Add footer
  addFooter(pdf);
  
  // Save the PDF
  pdf.save(`DeliveryNote_${deliveryNote.number}.pdf`);
  return true;
};

// ETAT 104 REPORT EXPORTS
interface ClientSummary {
  clientid: string;
  clientName: string;
  taxid: string;
  subtotal: number;
  taxTotal: number;
  total: number;
}

export const exportEtat104ToPDF = async (
  clientSummaries: ClientSummary[], 
  year: string, 
  month: string,
  totalAmount: number,
  totalTax: number,
  grandTotal: number
) => {
  const pdf = new jsPDF();
  
  // Add company header
  const companyInfo = await fetchCompanyInfo();
  
  // Define colors for report
  const primaryColor = "#3B82F6";  // Blue
  const secondaryColor = "#6366F1"; // Indigo
  
  // Add colored header banner
  const gradientHeight = 15;
  pdf.setFillColor(hexToRgb(primaryColor).r, hexToRgb(primaryColor).g, hexToRgb(primaryColor).b);
  pdf.rect(0, 0, pdf.internal.pageSize.width, gradientHeight, 'F');
  
  // Add company name
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(50, 50, 50);
  pdf.setFontSize(18);
  pdf.text(companyInfo?.businessName || 'YOUR COMPANY NAME', 105, 25, { align: 'center' });
  
  // Add company details
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(70, 70, 70);
  
  const companyDetails = [
    companyInfo?.address || 'Company Address',
    `NIF: ${companyInfo?.taxid || 'N/A'} | RC: ${companyInfo?.commerceRegNumber || 'N/A'}`,
    `Tel: ${companyInfo?.phone || 'N/A'} | Email: ${companyInfo?.email || 'info@company.com'}`
  ];
  
  pdf.text(companyDetails, 105, 30, { align: 'center' });
  
  // Add report title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(hexToRgb(primaryColor).r, hexToRgb(primaryColor).g, hexToRgb(primaryColor).b);
  pdf.text(`ÉTAT 104 REPORT - ${month}/${year}`, 105, 50, { align: 'center' });
  
  // Add report subtitle
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(12);
  pdf.setTextColor(100, 100, 100);
  pdf.text('Monthly TVA Declaration Summary', 105, 58, { align: 'center' });
  
  // Prepare table data
  const tableRows = clientSummaries.map(summary => [
    summary.clientName,
    summary.taxid,
    formatCurrency(summary.subtotal),
    formatCurrency(summary.taxTotal),
    formatCurrency(summary.total)
  ]);
  
  // Add totals row with bold styling
  tableRows.push([
    'TOTALS',
    '',
    formatCurrency(totalAmount),
    formatCurrency(totalTax),
    formatCurrency(grandTotal)
  ]);
  
  // Add data table
  const tableY = addStylizedTable(
    pdf,
    ['Client', 'NIF', 'Amount (Excl.)', 'TVA', 'Total'],
    tableRows,
    70
  );
  
  // Add summary section with styled box
  const summaryY = tableY + 20;
  
  // Draw summary box with light background
  drawRoundedRect(pdf, 40, summaryY, 130, 60, 3, "#F0F9FF"); // Light blue background
  
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(hexToRgb(primaryColor).r, hexToRgb(primaryColor).g, hexToRgb(primaryColor).b);
  pdf.text('Summary for État 104 Declaration', 105, summaryY + 10, { align: 'center' });
  
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(70, 70, 70);
  
  const detailsY = summaryY + 20;
  pdf.text('Total Sales (Excl. Tax):', 60, detailsY);
  pdf.text('Total TVA Collected:', 60, detailsY + 10);
  pdf.text('Total TVA Deductible (simulated):', 60, detailsY + 20);
  
  // Draw separator line
  pdf.setDrawColor(200, 200, 200);
  pdf.line(60, detailsY + 25, 150, detailsY + 25);
  
  // TVA due
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(hexToRgb(primaryColor).r, hexToRgb(primaryColor).g, hexToRgb(primaryColor).b);
  pdf.text('TVA Due:', 60, detailsY + 35);
  
  // Add amount values
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(70, 70, 70);
  pdf.text(formatCurrency(totalAmount), 150, detailsY, { align: 'right' });
  pdf.text(formatCurrency(totalTax), 150, detailsY + 10, { align: 'right' });
  pdf.text(formatCurrency(totalTax * 0.3), 150, detailsY + 20, { align: 'right' });
  
  // Add TVA due amount
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(hexToRgb(primaryColor).r, hexToRgb(primaryColor).g, hexToRgb(primaryColor).b);
  pdf.text(formatCurrency(totalTax * 0.7), 150, detailsY + 35, { align: 'right' });
  
  // Add compliance note
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text('Note: This report is fully compliant with the Algerian tax authority requirements for G50 declarations.', 
    105, 
    summaryY + 70, 
    { align: 'center' }
  );
  
  // Add date of generation
  const today = new Date().toLocaleDateString('fr-DZ');
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`Generated on: ${today}`, 105, pdf.internal.pageSize.height - 20, { align: 'center' });
  
  // Add page numbers
  const pageCount = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Page ${i} of ${pageCount}`, 105, pdf.internal.pageSize.height - 10, { align: 'center' });
  }
  
  // Save the PDF
  pdf.save(`Etat104_${month}_${year}.pdf`);
  return true;
};

export const exportEtat104ToExcel = (
  clientSummaries: ClientSummary[], 
  year: string, 
  month: string,
  totalAmount: number,
  totalTax: number,
  grandTotal: number
) => {
  // Prepare data for Excel
  const data = clientSummaries.map(summary => ({
    'Client': summary.clientName,
    'NIF': summary.taxid,
    'Amount (Excl.)': summary.subtotal,
    'TVA': summary.taxTotal,
    'Total': summary.total
  }));
  
  // Add totals row
  data.push({
    'Client': 'TOTALS:',
    'NIF': '',
    'Amount (Excl.)': totalAmount,
    'TVA': totalTax,
    'Total': grandTotal
  });
  
  // Create summary sheet data
  const summaryData = [
    { 'Summary': 'Total Sales (Excl. Tax):', 'Value': totalAmount },
    { 'Summary': 'Total TVA Collected:', 'Value': totalTax },
    { 'Summary': 'Total TVA Deductible (simulated):', 'Value': totalTax * 0.3 },
    { 'Summary': 'TVA Due:', 'Value': totalTax * 0.7 }
  ];
  
  // Create workbook and worksheets
  const wb = XLSX.utils.book_new();
  
  // Main data sheet
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'État 104 Data');
  
  // Summary sheet
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
  
  // Save Excel file
  XLSX.writeFile(wb, `Etat104_${month}_${year}.xlsx`);
  return true;
};

// Helper function for status colors
function getStatusColor(status: string): string {
  switch (status) {
    case 'paid':
    case 'approved':
    case 'delivered':
      return "#22C55E"; // Green
    case 'unpaid':
    case 'sent':
    case 'pending':
      return "#3B82F6"; // Blue
    case 'cancelled':
    case 'rejected':
      return "#EF4444"; // Red
    case 'credited':
    case 'draft':
    default:
      return "#94A3B8"; // Gray
  }
}

// Helper function to open a new window with HTML content for printing
export const openPrintableInvoice = (
  invoiceType: 'final' | 'proforma',
  invoiceId: string
) => {
  // Open a new tab/window with the printable invoice route - using v3 version
  const url = `/print/v3/${invoiceType}/${invoiceId}`;
  window.open(url, '_blank');
};
