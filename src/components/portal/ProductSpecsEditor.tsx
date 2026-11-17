import React, { useState } from 'react';
import { ProductSpecGroup, ProductSpecItem } from '../../types/product';
import { Plus, Trash2, Layers, Eye, EyeOff, GripVertical } from 'lucide-react';

interface ProductSpecsEditorProps {
  groups: ProductSpecGroup[];
  onChange: (updatedGroups: ProductSpecGroup[]) => void;
}

export const ProductSpecsEditor: React.FC<ProductSpecsEditorProps> = ({ groups, onChange }) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    const name = newGroupName.trim();
    if (groups.some(g => g.groupName.toLowerCase() === name.toLowerCase())) {
      alert('Nhóm thông số này đã tồn tại!');
      return;
    }
    onChange([...groups, { groupName: name, items: [] }]);
    setNewGroupName('');
  };

  const handleRemoveGroup = (groupIndex: number) => {
    const updated = groups.filter((_, idx) => idx !== groupIndex);
    onChange(updated);
  };

  const handleAddSpecItem = (groupIndex: number) => {
    const updated = [...groups];
    updated[groupIndex].items.push({
      name: '',
      value: ''
    });
    onChange(updated);
  };

  const handleUpdateSpecItem = (groupIndex: number, itemIndex: number, field: 'name' | 'value', val: string) => {
    const updated = [...groups];
    updated[groupIndex].items[itemIndex][field] = val;
    onChange(updated);
  };

  const handleRemoveSpecItem = (groupIndex: number, itemIndex: number) => {
    const updated = [...groups];
    updated[groupIndex].items = updated[groupIndex].items.filter((_, idx) => idx !== itemIndex);
    onChange(updated);
  };

  return (
    <div className="space-y-4 border border-hairline-soft rounded-xl p-4 bg-surface-soft/30 text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-hairline-soft">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-primary" />
          <h4 className="font-bold text-ink-deep text-xs uppercase tracking-wider">
            Thông số kỹ thuật sản phẩm (Product_Specs)
          </h4>
        </div>

        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-primary hover:underline font-semibold flex items-center gap-1 text-[11px]"
        >
          {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
          <span>{showPreview ? 'Ẩn xem trước' : 'Xem trước bảng thông số'}</span>
        </button>
      </div>

      {/* Add New Group Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Nhập tên nhóm thông số (VD: Màn hình, Camera, Vi xử lý, Pin & Sạc)..."
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          className="flex-1 h-9 px-3 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:border-2 focus:border-fb-blue focus:outline-none"
        />
        <button
          type="button"
          onClick={handleAddGroup}
          className="btn-marketing px-4 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1"
        >
          <Plus size={14} />
          <span>Thêm nhóm</span>
        </button>
      </div>

      {/* Groups List */}
      <div className="space-y-3 pt-1">
        {groups.length === 0 ? (
          <div className="text-center py-4 text-steel text-xs">
            Chưa có nhóm thông số kỹ thuật nào. Hãy nhập tên nhóm và bấm "Thêm nhóm" ở trên.
          </div>
        ) : (
          groups.map((group, gIdx) => (
            <div key={gIdx} className="bg-canvas border border-hairline-soft rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink-deep text-xs bg-surface-soft px-2.5 py-0.5 rounded-full border border-hairline-soft">
                  Nhóm: {group.groupName}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveGroup(gIdx)}
                  className="text-steel hover:text-critical p-1 transition"
                  title="Xóa cả nhóm"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Items in group */}
              <div className="space-y-1.5">
                {group.items.map((item, iIdx) => (
                  <div key={iIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Tên thông số (VD: Kích thước màn hình)..."
                      value={item.name}
                      onChange={(e) => handleUpdateSpecItem(gIdx, iIdx, 'name', e.target.value)}
                      className="w-1/3 h-8 px-2.5 bg-surface-soft/60 border border-hairline-soft rounded-lg text-ink text-xs focus:bg-canvas focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Giá trị (VD: 6.7 inch, Super Retina XDR)..."
                      value={item.value}
                      onChange={(e) => handleUpdateSpecItem(gIdx, iIdx, 'value', e.target.value)}
                      className="flex-1 h-8 px-2.5 bg-canvas border border-hairline rounded-lg text-ink text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSpecItem(gIdx, iIdx)}
                      className="text-steel hover:text-critical p-1"
                      title="Xóa dòng"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => handleAddSpecItem(gIdx)}
                  className="text-[11px] text-primary hover:underline font-bold inline-flex items-center gap-1 pt-1"
                >
                  <Plus size={12} />
                  <span>Thêm dòng thông số cho "{group.groupName}"</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Preview Box */}
      {showPreview && groups.length > 0 && (
        <div className="mt-3 p-4 bg-canvas border-2 border-primary/20 rounded-xl space-y-3">
          <div className="text-[11px] font-bold text-primary uppercase">Xem trước hiển thị phía khách hàng:</div>
          <div className="divide-y divide-hairline-soft text-xs border border-hairline-soft rounded-lg overflow-hidden">
            {groups.map((g, gi) => (
              <div key={gi}>
                <div className="bg-surface-soft px-3 py-1.5 font-bold text-ink-deep text-[11px]">
                  {g.groupName}
                </div>
                {g.items.map((it, ii) => (
                  <div key={ii} className="flex px-3 py-1.5 text-xs">
                    <span className="w-1/3 text-steel font-medium">{it.name || '(Chưa nhập tên)'}</span>
                    <span className="w-2/3 text-ink-deep">{it.value || '(Chưa nhập giá trị)'}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
