<template>
  <div class="employee-detail">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <h2>员工详情</h2>
          <el-button @click="$router.back()">返回</el-button>
        </div>
      </template>

      <el-descriptions v-if="employee" :column="2" border>
        <el-descriptions-item label="姓名">{{ employee.name }}</el-descriptions-item>
        <el-descriptions-item label="工号">{{ employee.employeeNo }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ employee.phone }}</el-descriptions-item>
        <el-descriptions-item label="所属部门">{{ employee.department?.name }}</el-descriptions-item>
        <el-descriptions-item label="职位">{{ employee.position }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <StatusTag :status="employee.status" />
        </el-descriptions-item>
        <el-descriptions-item label="入职日期">{{ employee.hireDate }}</el-descriptions-item>
      </el-descriptions>

      <div v-if="employee && employee.status === 'active'" class="actions">
        <el-button type="primary" @click="showTransferDialog = true">调动</el-button>
        <el-button type="danger" @click="showResignDialog = true">办理离职</el-button>
      </div>
      <div v-else-if="employee && employee.status === 'resigned'" class="resigned-notice">
        <el-alert title="该员工已离职，信息不可编辑" type="info" show-icon :closable="false" />
      </div>
    </el-card>

    <!-- 调动对话框 -->
    <el-dialog v-model="showTransferDialog" title="员工调动" width="500px" @close="resetTransferForm">
      <el-form :model="transferForm" label-width="100px">
        <el-form-item label="目标部门">
          <el-tree-select
            v-model="transferForm.newDeptId"
            :data="departmentTree"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            placeholder="请选择目标部门"
            check-strictly
            filterable
            clearable
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="新职位">
          <el-input v-model="transferForm.newPosition" placeholder="请输入新职位" />
        </el-form-item>
        <el-form-item label="调动原因">
          <el-input
            v-model="transferForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入调动原因"
          />
        </el-form-item>
      </el-form>
      <el-alert
        title="调动后，该员工相关的审批流/权限将发生变化，确认调动？"
        type="warning"
        show-icon
        :closable="false"
        style="margin-bottom: 16px"
      />
      <template #footer>
        <el-button @click="showTransferDialog = false">取消</el-button>
        <el-button type="primary" :loading="transferring" @click="handleTransfer">确认调动</el-button>
      </template>
    </el-dialog>

    <!-- 离职对话框 -->
    <el-dialog v-model="showResignDialog" title="办理离职" width="400px" @close="resetResignForm">
      <el-form :model="resignForm" label-width="100px">
        <el-form-item label="离职日期">
          <el-date-picker
            v-model="resignForm.resignDate"
            type="date"
            placeholder="请选择离职日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showResignDialog = false">取消</el-button>
        <el-button type="danger" :loading="resigning" @click="handleResign">确认离职</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getEmployee, transferEmployee, resignEmployee } from '@/api/employee'
import { getDepartmentTree } from '@/api/department'
import StatusTag from '@/components/StatusTag.vue'

const route = useRoute()

interface Employee {
  id: number
  name: string
  employeeNo: string
  phone: string
  department: { name: string } | null
  position: string
  status: string
  hireDate: string
  version: number
}

const loading = ref(false)
const employee = ref<Employee | null>(null)

// 调动相关
const showTransferDialog = ref(false)
const transferring = ref(false)
const transferForm = reactive({
  newDeptId: null as number | null,
  newPosition: '',
  reason: '',
})
const departmentTree = ref<any[]>([])

// 离职相关
const showResignDialog = ref(false)
const resigning = ref(false)
const resignForm = reactive({
  resignDate: '',
})

async function fetchEmployee() {
  const id = Number(route.params.id)
  if (!id) {
    ElMessage.error('无效的员工ID')
    return
  }
  loading.value = true
  try {
    const data = await getEmployee(id) as any
    employee.value = data as Employee
  } catch {
    // 全局拦截器已处理错误提示
  } finally {
    loading.value = false
  }
}

async function fetchDepartmentTree() {
  try {
    const data = await getDepartmentTree() as any
    departmentTree.value = data ?? []
  } catch {
    // 全局拦截器已处理错误提示
  }
}

function resetTransferForm() {
  transferForm.newDeptId = null
  transferForm.newPosition = ''
  transferForm.reason = ''
}

async function handleTransfer() {
  if (!employee.value) return
  if (!transferForm.newDeptId) {
    ElMessage.warning('请选择目标部门')
    return
  }
  if (!transferForm.newPosition) {
    ElMessage.warning('请输入新职位')
    return
  }
  if (!transferForm.reason) {
    ElMessage.warning('请输入调动原因')
    return
  }

  transferring.value = true
  try {
    await transferEmployee(employee.value.id, {
      newDeptId: transferForm.newDeptId,
      newPosition: transferForm.newPosition,
      reason: transferForm.reason,
      version: employee.value.version,
    } as any)
    ElMessage.success('调动成功')
    showTransferDialog.value = false
    await fetchEmployee()
  } catch (err: any) {
    if (err?.response?.status === 409) {
      ElMessage.warning('该员工信息已被他人修改，请刷新重试')
    }
    // 其他错误由全局拦截器处理
  } finally {
    transferring.value = false
  }
}

function resetResignForm() {
  resignForm.resignDate = ''
}

async function handleResign() {
  if (!employee.value) return
  if (!resignForm.resignDate) {
    ElMessage.warning('请选择离职日期')
    return
  }

  resigning.value = true
  try {
    await resignEmployee(employee.value.id, {
      resignDate: resignForm.resignDate,
    })
    ElMessage.success('离职办理成功')
    showResignDialog.value = false
    await fetchEmployee()
  } catch {
    // 全局拦截器已处理错误提示
  } finally {
    resigning.value = false
  }
}

onMounted(() => {
  fetchEmployee()
  fetchDepartmentTree()
})
</script>

<style scoped>
.employee-detail {
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

.actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;
}

.resigned-notice {
  margin-top: 20px;
}
</style>