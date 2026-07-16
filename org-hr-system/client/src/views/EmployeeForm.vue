<template>
  <div class="employee-form-container">
    <el-page-header :title="isEdit ? '编辑员工' : '新增员工'" @back="goBack" />

    <el-card class="form-card" shadow="never">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        style="max-width: 600px"
      >
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>

        <el-form-item label="工号" prop="employeeNo" :error="employeeNoError">
          <el-input
            v-model="form.employeeNo"
            placeholder="请输入工号"
            :disabled="isEdit"
            @blur="checkEmployeeNo"
            @input="employeeNoError = ''"
          />
        </el-form-item>

        <el-form-item label="手机号" prop="phone" :error="phoneError">
          <el-input
            v-model="form.phone"
            placeholder="请输入手机号"
            @blur="checkPhone"
            @input="phoneError = ''"
          />
        </el-form-item>

        <el-form-item label="性别" prop="gender">
          <el-select v-model="form.gender" placeholder="请选择性别">
            <el-option label="男" value="男" />
            <el-option label="女" value="女" />
          </el-select>
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>

        <el-form-item label="所属部门" prop="departmentId">
          <el-tree-select
            v-model="form.departmentId"
            :data="departmentStore.treeData"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            placeholder="请选择所属部门"
            check-strictly
            clearable
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="职位" prop="position">
          <el-input v-model="form.position" placeholder="请输入职位" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ isEdit ? '保存修改' : '确认新增' }}
          </el-button>
          <el-button @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useEmployeeStore } from '@/stores/employee'
import { useDepartmentStore } from '@/stores/department'
import { getEmployee } from '@/api/employee'

const route = useRoute()
const router = useRouter()
const employeeStore = useEmployeeStore()
const departmentStore = useDepartmentStore()

const formRef = ref<FormInstance>()
const submitting = ref(false)

const employeeNoError = ref('')
const phoneError = ref('')

const isEdit = computed(() => !!route.params.id)

const form = reactive({
  name: '',
  employeeNo: '',
  phone: '',
  gender: '',
  email: '',
  departmentId: null as number | null,
  position: '',
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  employeeNo: [{ required: true, message: '请输入工号', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    {
      pattern: /^1[3-9]\d{9}$/,
      message: '请输入正确的手机号',
      trigger: 'blur',
    },
  ],
  departmentId: [{ required: true, message: '请选择所属部门', trigger: 'change' }],
}

async function checkEmployeeNo() {
  const value = form.employeeNo
  if (!value) {
    employeeNoError.value = ''
    return
  }
  try {
    const res = await employeeStore.checkUnique('employeeNo', value)
    if (res && res.isExist) {
      employeeNoError.value = '该工号已存在'
    } else {
      employeeNoError.value = ''
    }
  } catch {
    // 校验失败时不显示错误，由后端兜底
  }
}

async function checkPhone() {
  const value = form.phone
  if (!value) {
    phoneError.value = ''
    return
  }
  try {
    const res = await employeeStore.checkUnique('phone', value)
    if (res && res.isExist) {
      phoneError.value = '该手机号已存在'
    } else {
      phoneError.value = ''
    }
  } catch {
    // 校验失败时不显示错误，由后端兜底
  }
}

function goBack() {
  router.push('/employees')
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const payload = {
      name: form.name,
      employee_number: form.employeeNo,
      phone: form.phone,
      gender: form.gender,
      email: form.email,
      department_id: form.departmentId,
      position: form.position,
    }

    if (isEdit.value) {
      const id = Number(route.params.id)
      await employeeStore.updateEmployee(id, payload)
      ElMessage.success('员工信息已更新')
    } else {
      await employeeStore.createEmployee(payload)
      ElMessage.success('员工已新增')
    }
    router.push('/employees')
  } catch {
    ElMessage.error(isEdit.value ? '更新失败，请稍后重试' : '新增失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

async function loadEmployee() {
  if (!isEdit.value) return
  const id = Number(route.params.id)
  try {
    const res = await getEmployee(id) as any
    const data = res.data || res
    form.name = data.name || ''
    form.employeeNo = data.employee_number || ''
    form.phone = data.phone || ''
    form.gender = data.gender || ''
    form.email = data.email || ''
    form.departmentId = data.department_id ?? null
    form.position = data.position || ''
  } catch {
    ElMessage.error('获取员工信息失败')
    router.push('/employees')
  }
}

onMounted(() => {
  departmentStore.fetchRootTree()
  loadEmployee()
})
</script>

<style scoped>
.employee-form-container {
  padding: 20px;
}

.form-card {
  margin-top: 20px;
}
</style>