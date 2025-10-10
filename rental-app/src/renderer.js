// 전역 변수
let masterItems = [];
let selectedItems = [];
const priceFields = ['price_1_3', 'price_4_7', 'price_8_10', 'price_11_14', 'price_15_20', 'price_21_31', 'price_1_2m', 'price_2_3m'];

// 이미지 매핑 객체
const imageMapping = {
  'A-1': '1.png', 'A-2': '1.png', 'A-3': '1.png',
      'A-4': '2.png', 'A-5': '2.png', 'A-6': '2.png', 'A-7': '2.png',
      'A-8': '3.png', 'A-9': '3.png', 'A-10': '3.png',
      'A-11': '4.png', 'A-12': '4.png', 'A-13': '4.png',
      'A-14': '5.png', 'A-15': '5.png',
      'A-16': '6.png', 'A-17': '6.png', 'A-18': '6.png',
      'A-19': '7.png', 'A-20': '7.png', 'A-21': '7.png',
      'A-22': '8.png',
      'A-23': '9.png',
      'A-24': '10.png', 'A-25': '10.png',
      'A-26': '11.png', 'A-27': '11.png', 'A-28': '11.png',
      'A-29': '12.png', 'A-30': '12.png',
      'A-31': '13.png',
      'A-32': '14.png', 
      'A-33': '15.png',
      'B-1': '16.png',
      'B-2': '17.png',
      'B-3': '18.png', 'B-4': '18.png', 'B-5': '18.png',
      'B-6': '19.png',
      'B-7': '20.png',
      'B-8': '21.png',
      'B-9': '22.png',
      'B-10': '23.png',
      'B-11': '24.png',
      'B-12': '25.png',
      'B-13': '26.png',
      'B-14': '27.png',
      'B-15': '28.png',
      'B-16': '29.png',
      'B-17': '30.png',
      'B-18': '31.png',
      'B-19': '32.png',
      'B-20': '33.png',
      'B-21': '34.png',
      'B-22': '35.png',
      'B-23': '36.png',
      'B-24': '37.png',
      'B-25': '38.png',
      'B-26': '39.png',
      'B-27': '40.png'
};

// 이미지 경로 가져오기 함수
function getImagePath(itemId) {
  const imageName = imageMapping[itemId];
  return imageName ? `../images/${imageName}` : '../images/default.png';
}

// DOM 요소
const elements = {
  importDataBtn: document.getElementById('importDataBtn'),
  itemCount: document.getElementById('itemCount'),
  itemList: document.getElementById('itemList'),
  selectedItems: document.getElementById('selectedItems'),
  searchInput: document.getElementById('searchInput'),
  rentalPeriod: document.getElementById('rentalPeriod'),
  transportQuantity: document.getElementById('transportQuantity'),
  transportUnitPrice: document.getElementById('transportUnitPrice'),
  saveBtn: document.getElementById('saveBtn'),
  generateExcelBtn: document.getElementById('generateExcelBtn')
};

// 초기화
async function initialize() {
  await loadItems();
  setupEventListeners();
}

// 마스터 데이터 가져오기
elements.importDataBtn.addEventListener('click', async () => {
  const filePath = await window.electronAPI.selectExcelFile();
  if (filePath) {
    const result = await window.electronAPI.importMasterData(filePath);
    if (result.success) {
      alert(`✅ ${result.count}개 품목을 가져왔습니다!`);
      await loadItems();
    } else {
      alert(`❌ 오류: ${result.error}`);
    }
  }
});

// 품목 로드
async function loadItems() {
  masterItems = await window.electronAPI.getAllItems();
  elements.itemCount.textContent = `품목: ${masterItems.length}개`;
  renderItemList();
}

// 품목 목록 렌더링
function renderItemList(filter = '') {
  const filtered = filter 
    ? masterItems.filter(item => 
        item.name.toLowerCase().includes(filter.toLowerCase()) ||
        item.id.toLowerCase().includes(filter.toLowerCase())
      )
    : masterItems;

  if (filtered.length === 0) {
    elements.itemList.innerHTML = '<p class="empty-message">품목이 없습니다. 마스터 데이터를 가져오세요.</p>';
    return;
  }

  // 카테고리별로 그룹화
  const grouped = {};
  filtered.forEach(item => {
    const category = item.category || '기타';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(item);
  });

  let html = '';
  Object.keys(grouped).forEach(category => {
    html += `
      <div class="category-group">
        <h3 class="category-title">${category}</h3>
        <div class="item-grid">
    `;
    
    grouped[category].forEach(item => {
      const periodIndex = parseInt(elements.rentalPeriod.value);
      const price = item[priceFields[periodIndex]] || 0;
      const imagePath = getImagePath(item.id);
      
      html += `
        <div class="item-card" data-id="${item.id}">
          <img src="${imagePath}" alt="${item.name}" class="item-image" onerror="this.src='../images/default.png'">
          <div class="item-info">
            <div class="item-name">${item.name}</div>
            <div class="item-size">${item.size || ''}</div>
            <div class="item-price">₩${formatNumber(price)}</div>
          </div>
          <button class="btn-add" onclick="addItem('${item.id}')">+ 추가</button>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  });

  elements.itemList.innerHTML = html;
}

// 품목 추가
function addItem(itemId) {
  const item = masterItems.find(i => i.id === itemId);
  if (!item) return;

  const periodIndex = parseInt(elements.rentalPeriod.value);
  const price = item[priceFields[periodIndex]] || 0;

  selectedItems.push({
    uniqueId: Date.now() + Math.random(),
    id: item.id,
    name: item.name,
    size: item.size,
    spec: item.spec,
    quantity: 1,
    unitPrice: price
  });

  renderSelectedItems();
  calculateTotals();
}

// 선택된 품목 렌더링
function renderSelectedItems() {
  if (selectedItems.length === 0) {
    elements.selectedItems.innerHTML = '<p class="empty-message">선택된 품목이 없습니다.</p>';
    return;
  }

  let html = `
    <table class="selected-table">
      <thead>
        <tr>
          <th>품명</th>
          <th>규격</th>
          <th>사양</th>
          <th>수량</th>
          <th>단가</th>
          <th>합계</th>
          <th>삭제</th>
        </tr>
      </thead>
      <tbody>
  `;

  selectedItems.forEach(item => {
    const total = item.quantity * item.unitPrice;
    html += `
      <tr>
        <td>${item.name}</td>
        <td>${item.size || '-'}</td>
        <td>${item.spec || '-'}</td>
        <td>
          <input type="number" class="quantity-input" value="${item.quantity}" 
                 min="1" onchange="updateQuantity('${item.uniqueId}', this.value)">
        </td>
        <td>₩${formatNumber(item.unitPrice)}</td>
        <td class="total-cell">₩${formatNumber(total)}</td>
        <td>
          <button class="btn-remove" onclick="removeItem('${item.uniqueId}')">🗑️</button>
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  elements.selectedItems.innerHTML = html;
}

// 수량 업데이트
function updateQuantity(uniqueId, quantity) {
  const item = selectedItems.find(i => i.uniqueId === uniqueId);
  if (item) {
    item.quantity = Math.max(1, parseInt(quantity) || 1);
    renderSelectedItems();
    calculateTotals();
  }
}

// 품목 삭제
function removeItem(uniqueId) {
  selectedItems = selectedItems.filter(i => i.uniqueId !== uniqueId);
  renderSelectedItems();
  calculateTotals();
}

// 합계 계산
function calculateTotals() {
  // 품목 소계
  const subtotal = selectedItems.reduce((sum, item) => 
    sum + (item.quantity * item.unitPrice), 0
  );

  // 운송비
  const transportQty = parseInt(elements.transportQuantity.value) || 0;
  const transportPrice = parseInt(elements.transportUnitPrice.value) || 0;
  const transportTotal = transportQty * transportPrice;

  // 공급가액
  const supplyTotal = subtotal + transportTotal;

  // 부가세
  const vat = Math.round(supplyTotal * 0.1);

  // 총합계
  const grandTotal = supplyTotal + vat;

  // 화면 업데이트
  document.getElementById('subtotal').textContent = `₩${formatNumber(subtotal)}`;
  document.getElementById('transportTotal').textContent = `₩${formatNumber(transportTotal)}`;
  document.getElementById('supplyTotal').textContent = `₩${formatNumber(supplyTotal)}`;
  document.getElementById('vat').textContent = `₩${formatNumber(vat)}`;
  document.getElementById('grandTotal').textContent = `₩${formatNumber(grandTotal)}`;
  document.getElementById('koreanAmount').textContent = `일금 ${numberToKorean(grandTotal)}원정`;
}

// 숫자를 한글로 변환
function numberToKorean(number) {
  const units = ['', '만', '억', '조'];
  const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const positions = ['천', '백', '십', ''];
  
  if (number === 0) return '영';
  
  let result = '';
  let unitIndex = 0;
  
  while (number > 0) {
    const part = number % 10000;
    if (part > 0) {
      let partStr = '';
      let tempPart = part;
      let posIndex = 0;
      
      while (tempPart > 0) {
        const digit = tempPart % 10;
        if (digit > 0) {
          partStr = digits[digit] + positions[3 - posIndex] + partStr;
        }
        tempPart = Math.floor(tempPart / 10);
        posIndex++;
      }
      result = partStr + units[unitIndex] + result;
    }
    number = Math.floor(number / 10000);
    unitIndex++;
  }
  
  return result;
}

// 숫자 포맷팅
function formatNumber(num) {
  return num.toLocaleString('ko-KR');
}

// 견적서 데이터 수집
function collectQuoteData() {
  const periodIndex = parseInt(elements.rentalPeriod.value);
  const periodLabels = ['1~3일', '4~7일', '8~10일', '11~14일', '15~20일', '21~31일', '1~2개월', '2~3개월'];
  
  const transportQty = parseInt(elements.transportQuantity.value) || 0;
  const transportPrice = parseInt(elements.transportUnitPrice.value) || 0;
  const transportTotal = transportQty * transportPrice;
  
  const subtotal = selectedItems.reduce((sum, item) => 
    sum + (item.quantity * item.unitPrice), 0
  );
  const supplyTotal = subtotal + transportTotal;
  const vat = Math.round(supplyTotal * 0.1);
  const grandTotal = supplyTotal + vat;

  return {
    eventName: document.getElementById('eventName').value,
    eventDate: document.getElementById('eventDate').value,
    eventLocation: document.getElementById('eventLocation').value,
    installDate: document.getElementById('installDate').value,      
    retrievalDate: document.getElementById('retrievalDate').value,
    contactPerson: document.getElementById('contactPerson').value,
    contactPhone: document.getElementById('contactPhone').value,
    rentalPeriod: periodIndex,
    rentalPeriodLabel: periodLabels[periodIndex],
    transportQuantity: transportQty,
    transportUnitPrice: transportPrice,
    items: selectedItems.map(item => ({
      id: item.id,
      name: item.name,
      size: item.size,
      spec: item.spec,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice
    })),
    subtotal,
    transportTotal,
    supplyTotal,
    vat,
    totalAmount: grandTotal
  };
}

// 견적서 저장
elements.saveBtn.addEventListener('click', async () => {
  if (selectedItems.length === 0) {
    alert('⚠️ 선택된 품목이 없습니다.');
    return;
  }

  if (!document.getElementById('eventName').value) {
    alert('⚠️ 행사명을 입력해주세요.');
    return;
  }

  const quoteData = collectQuoteData();
  const result = await window.electronAPI.saveQuote(quoteData);

  if (result.success) {
    alert(`✅ 견적서가 저장되었습니다! (ID: ${result.quoteId})`);
  } else {
    alert(`❌ 저장 오류: ${result.error}`);
  }
});

// Excel 견적서 생성
elements.generateExcelBtn.addEventListener('click', async () => {
  if (selectedItems.length === 0) {
    alert('⚠️ 선택된 품목이 없습니다.');
    return;
  }

  if (!document.getElementById('eventName').value) {
    alert('⚠️ 행사명을 입력해주세요.');
    return;
  }

  const quoteData = collectQuoteData();
  const result = await window.electronAPI.generateExcel(quoteData);

  if (result.success) {
    alert(`✅ Excel 견적서가 생성되었습니다!\n저장 위치: ${result.filePath}`);
  } else if (result.canceled) {
    // 사용자가 취소한 경우
  } else {
    alert(`❌ 생성 오류: ${result.error}`);
  }
});

// 이벤트 리스너 설정
function setupEventListeners() {
  // 검색
  elements.searchInput.addEventListener('input', (e) => {
    renderItemList(e.target.value);
  });

  // 렌탈 기간 변경 시 가격 업데이트
  elements.rentalPeriod.addEventListener('change', () => {
    // 선택된 품목의 가격 업데이트
    const periodIndex = parseInt(elements.rentalPeriod.value);
    selectedItems.forEach(item => {
      const masterItem = masterItems.find(i => i.id === item.id);
      if (masterItem) {
        item.unitPrice = masterItem[priceFields[periodIndex]] || 0;
      }
    });
    
    renderItemList();
    renderSelectedItems();
    calculateTotals();
  });

  // 운송비 변경 시 합계 업데이트
  elements.transportQuantity.addEventListener('input', calculateTotals);
  elements.transportUnitPrice.addEventListener('input', calculateTotals);
}

// 전역 함수로 노출 (HTML에서 onclick으로 사용)
window.addItem = addItem;
window.removeItem = removeItem;
window.updateQuantity = updateQuantity;

// 앱 시작
initialize();