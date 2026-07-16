<template>
  <div class="employee-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>员工列表</h2>
        </div>
      </template>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          placeholder="请输入姓名或工号搜索"
          clearable
          style="width: 240px"
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select
          v-model="statusFilter"
          placeholder="员工状态"
          clearable
          style="width: 140px"
          @change="handleStatusChange"
        >
          <el-option label="全部" value="" />
          <el-option label="在职" value="active" />
          <el-option label="离职" value="resigned" />
        </el-select>

        <el-button type="primary" @click="handleSearch">搜索</el-button>
      </div>

      <!-- 表格 -->
      <el-table
        v-loading="employeeStore.loading"
        :data="employeeStore.employeeList"
        border
        stripe
        style="width: 100%; margin-top: 16px"
      >
        <el-table-column prop="employee_number" label="工号" width="120" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="gender" label="性别" width="70" />
        <el-table-column prop="phone" label="手机号" width="140" />
        <el-table-column prop="position" label="职位" min-width="120" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <StatusTag :status="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleView(row)">
              查看详情
            </el-button>
            <el-button type="primary" link size="small" @click="handleEdit(row)">
              编辑
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="employeeStore.currentPage"
          v-model:page-size="employeeStore.pageSize"
          :total="employeeStore.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import { useEmployeeStore } from '@/stores/employee'
import { useDepartmentStore } from '@/stores/department'
import StatusTag from '@/components/StatusTag.vue'

const router = useRouter()
const employeeStore = useEmployeeStore()
const departmentStore = useDepartmentStore()

const keyword = ref('')
const statusFilter = ref('')

// 搜索
function handleSearch() {
  employeeStore.setFilters({
    keyword: keyword.value || undefined,
    status: statusFilter.value || undefined,
    deptId: departmentStore.selectedDeptId ?? undefined,
  })
  employeeStore.fetchEmployees()
}

// 状态筛选变化
function handleStatusChange() {
  handleSearch()
}

// 分页切换
function handlePageChange(page: number) {
  employeeStore.setPage(page)
  employeeStore.fetchEmployees()
}

// 每页条数切换
function handleSizeChange(size: number) {
  employeeStore.pageSize = size
  employeeStore.setPage(1)
  employeeStore.fetchEmployees()
}

// 查看详情
function handleView(row: { id: number }) {
  router.push(`/employees/${row.id}`)
}

// 编辑
function handleEdit(row: { id: number }) {
  router.push(`/employees/${row.id}/edit`)
}

// 监听部门选中变化
watch(
  () => departmentStore.selectedDeptId,
  () => {
    employeeStore.setFilters({
      deptId: departmentStore.selectedDeptId ?? undefined,
      keyword: keyword.value || undefined,
      status: statusFilter.value || undefined,
    })
    employeeStore.fetchEmployees()
  }
)

onMounted(() => {
  // 同步初始筛选条件
  if (departmentStore.selectedDeptId) {
    employeeStore.setFilters({ deptId: departmentStore.selectedDeptId })
  }
  employeeStore.fetchEmployees()
})
</script>

<style scoped>
.employee-list {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>